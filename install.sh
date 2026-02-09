#!/bin/sh
# install.sh — Installer for the uniku CLI
# Usage: curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh

set -eu

# ── Constants ────────────────────────────────────────────────────────

GITHUB_REPO="jkomyno/uniku"
BINARY_NAME="uniku"
INSTALL_DIR="${UNIKU_INSTALL_DIR:-/usr/local/bin}"

# ── Output helpers ───────────────────────────────────────────────────

info() {
  printf '\033[0;34m[info]\033[0m %s\n' "$@"
}

warn() {
  printf '\033[0;33m[warn]\033[0m %s\n' "$@" >&2
}

error() {
  printf '\033[0;31m[error]\033[0m %s\n' "$@" >&2
  exit 1
}

# ── Platform detection ───────────────────────────────────────────────

detect_platform() {
  local os arch

  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    *)      error "Unsupported operating system: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64)   arch="x64" ;;
    aarch64|arm64)  arch="arm64" ;;
    *)              error "Unsupported architecture: $arch" ;;
  esac

  case "${os}-${arch}" in
    linux-x64|darwin-x64|darwin-arm64) ;;
    linux-arm64)
      error "linux-arm64 is not yet supported. See https://github.com/$GITHUB_REPO/issues" ;;
    *)
      error "Unsupported platform: ${os}-${arch}" ;;
  esac

  echo "${os}-${arch}"
}

# ── Version resolution ───────────────────────────────────────────────

resolve_version() {
  if [ -n "${UNIKU_VERSION:-}" ]; then
    echo "uniku-cli-v${UNIKU_VERSION}"
    return
  fi

  local auth_header=""
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    auth_header="Authorization: Bearer ${GITHUB_TOKEN}"
  fi

  # Fetch latest CLI release tag (filter for uniku-cli-v* tags)
  local version
  if [ -n "$auth_header" ]; then
    version="$(
      curl -fsSL -H "$auth_header" \
        "https://api.github.com/repos/$GITHUB_REPO/releases" \
        | grep -o '"tag_name": *"uniku-cli-v[^"]*"' \
        | head -1 \
        | cut -d'"' -f4
    )" || error "Failed to fetch releases from GitHub API"
  else
    version="$(
      curl -fsSL \
        "https://api.github.com/repos/$GITHUB_REPO/releases" \
        | grep -o '"tag_name": *"uniku-cli-v[^"]*"' \
        | head -1 \
        | cut -d'"' -f4
    )" || error "Failed to fetch releases from GitHub API. If rate-limited, set GITHUB_TOKEN."
  fi

  [ -n "$version" ] || error "Could not find any uniku CLI release. Check https://github.com/$GITHUB_REPO/releases"
  echo "$version"
}

# ── Checksum verification ────────────────────────────────────────────

compute_sha256() {
  if command -v sha256sum > /dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum > /dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    openssl dgst -sha256 "$1" | awk '{print $NF}'
  fi
}

verify_checksum() {
  local file="$1"
  local checksums_file="$2"
  local filename
  filename="$(basename "$file")"

  local expected
  expected="$(grep "$filename" "$checksums_file" | cut -d' ' -f1)"

  if [ -z "$expected" ]; then
    warn "No checksum found for $filename, skipping verification"
    return 0
  fi

  local actual
  actual="$(compute_sha256 "$file")"

  if [ "$actual" != "$expected" ]; then
    error "Checksum verification failed for $filename
  Expected: $expected
  Actual:   $actual"
  fi

  info "Checksum verified"
}

# ── Download and install ─────────────────────────────────────────────

download_and_install() {
  local platform="$1"
  local version="$2"
  local tmpdir

  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  local tarball="${BINARY_NAME}-${platform}.tar.gz"
  local base_url="https://github.com/$GITHUB_REPO/releases/download/${version}"

  info "Downloading $BINARY_NAME $version for $platform..."
  curl -fsSL --progress-bar -o "$tmpdir/$tarball" "${base_url}/${tarball}" \
    || error "Download failed. Check that $version exists for $platform at:
  ${base_url}/${tarball}"

  info "Downloading checksums..."
  if curl -fsSL -o "$tmpdir/CHECKSUMS.sha256" "${base_url}/CHECKSUMS.sha256" 2>/dev/null; then
    verify_checksum "$tmpdir/$tarball" "$tmpdir/CHECKSUMS.sha256"
  else
    warn "Could not download checksums file, skipping verification"
  fi

  info "Extracting..."
  tar -xzf "$tmpdir/$tarball" -C "$tmpdir"

  # The tarball contains a file named e.g. "uniku-darwin-arm64", rename to "uniku"
  local extracted_name="${BINARY_NAME}-${platform}"
  if [ -f "$tmpdir/$extracted_name" ]; then
    mv "$tmpdir/$extracted_name" "$tmpdir/$BINARY_NAME"
  elif [ ! -f "$tmpdir/$BINARY_NAME" ]; then
    error "Expected binary not found after extraction (looked for $extracted_name and $BINARY_NAME)"
  fi

  info "Installing to $INSTALL_DIR..."
  if [ -w "$INSTALL_DIR" ]; then
    mv "$tmpdir/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
  else
    info "Elevated permissions required to install to $INSTALL_DIR"
    sudo mv "$tmpdir/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
  fi

  chmod +x "$INSTALL_DIR/$BINARY_NAME"

  # Strip macOS quarantine attribute
  local os
  os="$(uname -s)"
  if [ "$os" = "Darwin" ]; then
    xattr -d com.apple.quarantine "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true
  fi

  info "Installed $BINARY_NAME to $INSTALL_DIR/$BINARY_NAME"
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
  local platform version

  platform="$(detect_platform)"
  version="$(resolve_version)"

  info "Platform: $platform"
  info "Version:  $version"
  echo ""

  download_and_install "$platform" "$version"

  echo ""
  if command -v "$BINARY_NAME" > /dev/null 2>&1; then
    info "Success! Run '$BINARY_NAME --help' to get started."
  else
    warn "$BINARY_NAME was installed to $INSTALL_DIR but is not in your PATH."
    warn "Add this to your shell profile:"
    warn "  export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
}

# Wrap in main() to protect against partial downloads
main "$@"
