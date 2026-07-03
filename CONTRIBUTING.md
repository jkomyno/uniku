# Contributing to uniku

Thanks for your interest in contributing to uniku.

## Prerequisites

- Node.js 24.13.0
- pnpm 10.28.2
- Bun (optional, for `pnpm bench:summary`)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/jkomyno/uniku.git
cd uniku

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development Workflow

### Building

```bash
# Build all packages
pnpm build

# Build with watch mode
pnpm build:watch
```

### Testing

Tests are organized by type in `__tests__/` directories:

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests (compatibility with npm packages)
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run Cloudflare Workers E2E tests specifically
pnpm test:e2e:cloudflare
```

CI runs package unit tests through the `test:unit` script and package
integration tests through `test:integration`. Add those scripts to any package
whose tests should run in the corresponding CI step.

### Benchmarks

```bash
# Run all benchmarks
pnpm bench

# Run compatibility benchmarks vs npm alternatives
pnpm bench:compat

# Generate benchmark summary (requires Bun)
pnpm bench:summary
```

### Linting

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check for issues
pnpm lint:ci

# Fix issues automatically
pnpm lint
```

## Making Changes

1. Create a branch for your changes
2. Make your changes
3. Add tests for new functionality
4. Run `pnpm lint` and `pnpm test` to verify everything works
5. Add a changeset describing your changes:

```bash
pnpm changeset
```

This will prompt you to:
- Select which packages are affected
- Choose the semver bump type (patch/minor/major)
- Write a summary of your changes

## Pull Requests

- Keep PRs focused on a single change
- Include tests for new functionality
- Update documentation if needed
- Ensure CI passes

Preview releases are automatically created for each PR via [pkg.pr.new](https://pkg.pr.new), so reviewers can test your changes directly.

## Project Structure

```
packages/
  uniku/                 # Core ID generation library
    src/
      common/
        bytes.ts         # Byte manipulation (increment, timestamp writing)
        random-pool.ts   # Thread-safe random byte pooling (for CUID2)
        random.ts        # Simple random pool for UUID/ULID/KSUID
      uuid/
        v4.ts            # UUID v4 implementation
        v7.ts            # UUID v7 (RFC 9562, time-ordered)
        common/
          hex.ts         # Hex encoding utilities
          uuid.ts        # UUID formatting and parsing
      ulid/
        ulid.ts          # ULID implementation
        crockford.ts     # Crockford Base32 encoding
      cuid2/
        cuid2.ts         # CUID2 implementation (SHA3-512 based)
      nanoid/
        nanoid.ts        # Nanoid implementation
      ksuid/
        ksuid.ts         # KSUID implementation
        base62.ts        # Base62 encoding for KSUID
    __tests__/
      unit/              # Unit tests
      integration/       # Integration tests (npm package compatibility)
      bench/             # Benchmarks
      e2e/
        runtimes/
          cloudflare/    # Cloudflare Workers E2E tests
  cli/                   # CLI tool (@uniku/cli)
    src/
      commands/          # Command definitions (generate, validate, inspect)
      domain/            # Constants, error types, shared types
      generators/        # ID generation wrappers
      inspectors/        # ID metadata extraction
      validators/        # ID validation logic
      services/          # Output and stdin services
      bin.ts             # Entry point (Bun runtime)
    __tests__/           # CLI tests
```

## Code Style

- Use TypeScript
- Keep modules small and focused
- Avoid barrel exports (index.ts re-exports) - use direct imports
- Prefer `globalThis.crypto` over `node:crypto` for runtime compatibility
