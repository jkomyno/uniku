# AGENTS.md

Uniku ID generation library implementation.

## Key Patterns

- Each generator is a function with attached static methods (`toBytes`, `fromBytes`, `isValid`, etc.)
- Time-ordered generators maintain module-level state for monotonic ordering
- Uses Web Crypto API (`globalThis.crypto`) for universal runtime support
- ESM only, no CommonJS

## Guidelines

For adding new ID generators, see `docs/ID_GENERATION.md`.

## Testing

- Test files use `@/src/...` import alias
- Use `random` option for deterministic output
- Mock `Date.now()` for timestamp tests
