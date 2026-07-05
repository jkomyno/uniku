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
- **Published packages**: `packages/uniku` (ID generators) and `packages/cli` (the `uniku` command)
- **E2E workspace**: Cloudflare Workers tests live under `packages/uniku/__tests__/e2e/runtimes/cloudflare`
- **Entry points**: Separate library imports per generator (`uniku/uuid/v7`, `uniku/ulid`, etc.) — no barrel exports
- **Runtime**: Uses Web Crypto API (`globalThis.crypto`) for universal compatibility

## Guidance Hierarchy

`AGENTS.md` is the canonical repo-wide AI guidance file. `CLAUDE.md` is a symlink to this file so Claude Code reads the same instructions without duplicating them.

Before editing, read this file plus any closer `AGENTS.md` that owns the paths you will touch. Keep guidance concise and operational: update it when a change affects durable structure, contracts, workflows, verification, or generated artifacts.

Current child guidance:

| Path                                                   | Scope                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| [`.agents/skills/AGENTS.md`](.agents/skills/AGENTS.md) | Local agent skills, references, scripts, and source pointers |
| [`packages/uniku/AGENTS.md`](packages/uniku/AGENTS.md) | Published ID generation package implementation               |

## Key Concepts

- **Time-ordered IDs** (uuidv7, ulid, ksuid): Maintain module-level state for monotonic sequencing
- **Random byte pooling**: Pre-allocated buffers for performance
- **Tree-shakeable**: Each generator is a separate entry point
- **Effect CLI**: `packages/cli` uses Effect v4 (`effect@4.0.0-beta.x`, pinned exact — no `^` or `@beta` ranges; do not auto-bump betas). Read `.agents/skills/effect-v4` before any Effect work in the CLI and verify APIs against `repos/effect-smol`. Never use Effect v3 packages (`@effect/cli`, `@effect/platform`) — they have no v4 equivalents.

## Local Agent Skills

Repo-local skills live under `.agents/skills`:

- `typescript`: strict TypeScript, declaration emit, package boundaries, and CLI Effect interop.
- `testing`: Vitest, CLI tests, integration tests, Cloudflare e2e tests, and Effect v4 CLI tests.
- `effect-v4`: source-grounded Effect v4 guidance for the CLI (conventions, v3→v4 rename maps, verification workflow).

`repos/effect-smol` is a read-only submodule clone of <https://github.com/effect-TS/effect-smol> for Effect v4 source lookup. If it is missing, run `git submodule update --init repos/effect-smol`. Never import from or edit `repos/**`; use installed package dependencies in source code.

## Testing

- Unit tests validate generator output and edge cases
- Integration tests cross-validate with npm reference packages
- E2E tests run in Cloudflare Workers environment

## Package Guidelines

See `packages/uniku/AGENTS.md` for implementation conventions.
