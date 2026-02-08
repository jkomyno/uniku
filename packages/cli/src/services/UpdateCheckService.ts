import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

// ── Types ────────────────────────────────────────────────────────────

export interface UpdateInfo {
  readonly currentVersion: string
  readonly latestVersion: string
  readonly isStandaloneBinary: boolean
}

interface UpdateCache {
  readonly latestVersion: string
  readonly checkedAt: number
}

// ── Service tag ──────────────────────────────────────────────────────

export class UpdateCheckService extends Context.Tag('UpdateCheckService')<
  UpdateCheckService,
  {
    /** Check for available updates. Returns Some(info) if update available, None otherwise. */
    readonly check: (currentVersion: string) => Effect.Effect<Option.Option<UpdateInfo>>
    /** Print the update notification to stderr. */
    readonly notify: (info: UpdateInfo) => Effect.Effect<void>
  }
>() {}

// ── Constants ────────────────────────────────────────────────────────

const PACKAGE_NAME = '@uniku/cli'
const REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`
const CACHE_FILE = join(tmpdir(), 'uniku-update-check.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FETCH_TIMEOUT_MS = 5_000

// ── Version comparison ───────────────────────────────────────────────

/**
 * Parse a semver version string into its components.
 * Returns null if the string is not a valid semver.
 */
export function parseSemver(version: string) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

/**
 * Returns true if `latest` is newer than `current`.
 *
 * Handles pre-release correctly:
 * - 1.0.0 > 1.0.0-beta.1 (stable is newer than pre-release of same version)
 * - 1.0.0-beta.1 > 0.9.0 (pre-release of higher version is newer)
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const l = parseSemver(latest)
  const c = parseSemver(current)
  if (!l || !c) return false

  if (l.major !== c.major) return l.major > c.major
  if (l.minor !== c.minor) return l.minor > c.minor
  if (l.patch !== c.patch) return l.patch > c.patch

  // Same major.minor.patch — stable (no prerelease) beats pre-release
  if (l.prerelease === null && c.prerelease !== null) return true
  if (l.prerelease !== null && c.prerelease === null) return false

  return false
}

// ── Skip conditions ──────────────────────────────────────────────────

export function shouldSkipUpdateCheck(): boolean {
  return (
    !!process.env.NO_UPDATE_NOTIFIER ||
    !!process.env.CI ||
    !!process.env.CONTINUOUS_INTEGRATION ||
    process.env.NODE_ENV === 'test' ||
    !process.stderr.isTTY
  )
}

// ── Notification formatting ──────────────────────────────────────────

export function formatNotification(info: UpdateInfo): string {
  const noColor = !!process.env.NO_COLOR

  if (noColor) {
    const updateCmd = info.isStandaloneBinary
      ? `Download at https://github.com/jkomyno/uniku/releases`
      : `Run \`npm install -g ${PACKAGE_NAME}\` to update`
    return [
      '',
      `  Update available: ${info.currentVersion} → ${info.latestVersion}`,
      `  ${updateCmd}`,
      `  Set NO_UPDATE_NOTIFIER=1 to disable`,
      '',
    ].join('\n')
  }

  const dim = '\x1b[2m'
  const cyan = '\x1b[36m'
  const boldCyan = '\x1b[1;36m'
  const reset = '\x1b[0m'

  const updateCmd = info.isStandaloneBinary
    ? `Download at ${cyan}https://github.com/jkomyno/uniku/releases${reset}`
    : `Run ${cyan}\`npm install -g ${PACKAGE_NAME}\`${reset} to update`

  return [
    '',
    `  ${dim}Update available:${reset} ${dim}${info.currentVersion}${reset} ${dim}→${reset} ${boldCyan}${info.latestVersion}${reset}`,
    `  ${updateCmd}`,
    `  ${dim}Set NO_UPDATE_NOTIFIER=1 to disable${reset}`,
    '',
  ].join('\n')
}

// ── Cache helpers (plain Node.js — maximally resilient) ──────────────

function readCache(): UpdateCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null
    const content = readFileSync(CACHE_FILE, 'utf-8')
    return JSON.parse(content) as UpdateCache
  } catch {
    return null
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    const dir = dirname(CACHE_FILE)
    mkdirSync(dir, { recursive: true })
    const tmpPath = `${CACHE_FILE}.tmp`
    writeFileSync(tmpPath, JSON.stringify(cache))
    renameSync(tmpPath, CACHE_FILE)
  } catch {
    // Silently ignore write errors
  }
}

// ── Registry fetch ───────────────────────────────────────────────────

function fetchLatestVersion(currentVersion: string): Effect.Effect<string | null> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(REGISTRY_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `${PACKAGE_NAME}/${currentVersion}`,
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { version?: string }
        if (!data.version) throw new Error('Missing version field')
        return data.version
      }),
    catch: () => new Error('fetch failed'),
  }).pipe(Effect.catchAll(() => Effect.succeed(null)))
}

// ── Standalone binary detection ──────────────────────────────────────

declare const __STANDALONE_BINARY__: boolean | undefined

function isStandaloneBinary(): boolean {
  try {
    return typeof __STANDALONE_BINARY__ !== 'undefined' && __STANDALONE_BINARY__ === true
  } catch {
    return false
  }
}

// ── Live implementation ──────────────────────────────────────────────

export const UpdateCheckServiceLive = UpdateCheckService.of({
  check(currentVersion) {
    return Effect.gen(function* () {
      if (shouldSkipUpdateCheck()) {
        return Option.none()
      }

      const cached = readCache()
      const now = Date.now()

      // Cache is fresh — use cached result
      if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
        if (isNewerVersion(cached.latestVersion, currentVersion)) {
          return Option.some<UpdateInfo>({
            currentVersion,
            latestVersion: cached.latestVersion,
            isStandaloneBinary: isStandaloneBinary(),
          })
        }
        return Option.none()
      }

      // Cache is stale or missing — fetch from registry
      const latestVersion = yield* fetchLatestVersion(currentVersion)

      if (latestVersion === null) {
        return Option.none()
      }

      writeCache({ latestVersion, checkedAt: now })

      if (isNewerVersion(latestVersion, currentVersion)) {
        return Option.some<UpdateInfo>({
          currentVersion,
          latestVersion,
          isStandaloneBinary: isStandaloneBinary(),
        })
      }

      return Option.none()
    }).pipe(Effect.catchAll(() => Effect.succeed(Option.none())))
  },

  notify(info) {
    return Effect.sync(() => {
      process.stderr.write(formatNotification(info))
    })
  },
})
