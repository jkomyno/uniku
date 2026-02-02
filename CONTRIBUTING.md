# Contributing to uniku

Thanks for your interest in contributing to uniku.

## Prerequisites

- Node.js 24.13.0
- pnpm 10.28.2

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

Tests live in `__tests__/` directories within each package:

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run benchmarks
pnpm bench
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
  uniku/
    src/
      uuid/
        v4.ts          # UUID v4 with custom RNG support
        v7.ts          # UUID v7 (RFC 9562, time-ordered)
        common/        # Shared utilities (hex encoding, parsing)
    __tests__/
      unit/            # Unit tests
      bench/           # Benchmarks
```

## Code Style

- Use TypeScript
- Keep modules small and focused
- Avoid barrel exports (index.ts re-exports) - use direct imports
- Prefer `globalThis.crypto` over `node:crypto` for runtime compatibility
