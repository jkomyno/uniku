# AGENTS.md

A TypeScript library providing multiple unique ID generation strategies (UUID v4/v7, ULID, CUID2, Nanoid, KSUID) that works across all JavaScript runtimes.

## Commands

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm test           # Run all tests (except e2e)
pnpm test:e2e       # Run all e2e tests (e.g., on Cloudflare Workers)
pnpm test:unit      # Unit tests only
pnpm typecheck      # TypeScript type checking
pnpm lint:fix       # Fix lint issues
pnpm bench:summary  # Run benchmarks to compare uniku to other npm packages, displays summary table
pnpm bundle:summary # Run bundle size analysis, displays summary table
pnpm changeset      # Create changeset for versioning
```

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo
- **Single package**: `packages/uniku` (all ID generators)
- **Entry points**: Separate imports per generator (`uniku/uuid/v7`, `uniku/ulid`, etc.) — no barrel exports
- **Runtime**: Uses Web Crypto API (`globalThis.crypto`) for universal compatibility

## Key Concepts

- **Time-ordered IDs** (uuidv7, ulid, ksuid): Maintain module-level state for monotonic sequencing
- **Random byte pooling**: Pre-allocated buffers for performance
- **Tree-shakeable**: Each generator is a separate entry point

## Testing

- Unit tests validate generator output and edge cases
- Integration tests cross-validate with npm reference packages
- E2E tests run in Cloudflare Workers environment

## Package Guidelines

See `packages/uniku/AGENTS.md` for implementation conventions.
