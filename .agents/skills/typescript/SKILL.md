---
name: typescript
description: Focused TypeScript type-safety guide for uniku. Use when fixing typecheck, isolatedDeclarations, isolatedModules, or verbatimModuleSyntax errors; designing or reviewing exported TypeScript APIs, package entry points, CLI service shapes, unknown/any boundaries, type-only imports, Promise boundaries, or Effect v4 CLI code. Do not use for routine TypeScript edits that only follow nearby code.
---

# TypeScript

## Scope

Follow root `AGENTS.md` for uniku-wide runtime, package-entrypoint, Effect migration, and verification rules. This skill only adds TypeScript-specific API and type-safety guidance.

Use this skill for typecheck failures, declaration emit constraints, exported API design, unsafe boundary cleanup, and CLI Promise/Effect interop. For routine implementation edits, follow nearby code.

## First Checks

- Read the local `tsconfig*.json`, package scripts, and nearby code before changing TypeScript patterns.
- Treat uniku as strict TypeScript with `isolatedModules`, `isolatedDeclarations`, and `verbatimModuleSyntax`.
- The library package emits declarations with `isolatedDeclarations`; exported values usually need explicit return types.
- Defer formatting and import ordering to Biome; do not hand-align style beyond what the tools enforce.

## Types And Type Safety

- Avoid explicit type annotations when TypeScript can infer the type locally.
- Add explicit return types and exported value types when required by `isolatedDeclarations` or when they clarify a public API.
- Prefer `unknown` for untrusted values; narrow or decode before use.
- Prefer `Record<PropertyKey, unknown>` over `object` or `any` for generic records.
- Avoid `any`. If it is unavoidable, confine it to the smallest adapter or compatibility boundary and immediately narrow or decode it.
- Prefer `interface` for object shapes that model public inputs, service ports, and extension points.
- Prefer `type` for unions, intersections, mapped types, conditional types, and simple aliases.
- Use discriminated unions, tagged errors, branded types, or Schema classes instead of loose strings and parallel boolean flags.
- Prefer `as const satisfies SomeShape` over plain `as const` or broad assertions.
- Prefer `@ts-expect-error` over `@ts-ignore`, and include a short reason. Remove the directive when the underlying gap is gone.
- Avoid meaningless optional, `null`, or `undefined` parameters. Model variants with explicit option objects, discriminants, or separate functions.

## Package Boundaries

- Keep `packages/uniku` runtime-portable: Web Crypto only, no Node-only imports, no Effect dependency, no process globals.
- Preserve separate library entry points such as `uniku/uuid/v7`, `uniku/ulid`, and `uniku/errors`; do not add barrel exports casually.
- Decode and validate untrusted CLI inputs at the command boundary before passing typed options into generator code.
- Keep CLI presentation, update checks, stdin/stdout, and process concerns out of the ID generator package.

## Async And Effect Boundaries

- In `packages/uniku`, keep APIs synchronous unless runtime APIs force async.
- In the CLI, limit Promise-based APIs to platform interop, package-manager/network calls, Bun scripts, and explicit JavaScript-facing entrypoints.
- Wrap fallible Promise work through typed Effect interop and map rejections to CLI-owned errors.
- Do not use non-fallible Promise interop for fallible operations; rejected promises become defects instead of typed failures.
- Use `async`/`await` rather than `.then()` chains only in small non-Effect boundary code that genuinely returns a Promise.
- Use `Promise.all` or `Promise.race` only at Promise boundaries. Prefer Effect concurrency primitives inside Effect-based CLI code.
- Avoid silent `.catch(() => fallback)` handlers. Log or map the error deliberately, and never leak secrets in logs.

## Effect v4

- The CLI runs on Effect v4 (`effect@4.0.0-beta.x`, pinned exact). Never use Effect v3 packages (`@effect/cli`, `@effect/platform`) — they have no v4 equivalents.
- For any Effect work in the CLI, use `.agents/skills/effect-v4` and verify unfamiliar APIs against `repos/effect-smol/`.
- Treat `repos/effect-smol/` as a read-only local source reference; never import from it.
- Use the `effect-v4` skill for exact generator syntax, function helpers, Schema-backed tagged errors, services, layers, and v4 traps.

## Imports And Exports

- Use `import type { ... }` for type-only imports under `verbatimModuleSyntax`.
- Keep type imports and value imports easy to scan; follow the shape already used in the file.
- Do not reach across package internals when a public workspace entrypoint exists.
- Prefer named exports for library code. Reserve `export default` for config files or framework hooks that require it.
- Search for existing package-local helpers before adding small duplicate guards, parsers, normalizers, timing utilities, or JSON helpers.

## Code Structure

- Prefer object destructuring for option objects and service dependencies.
- Name constants for ID formats, CLI option values, environment flags, retry limits, and output modes instead of scattering magic strings or numbers.
- Keep functions small enough that typed inputs, typed failures, and required services remain obvious.
- In library generators, keep randomness and time injectable where tests need deterministic output.
- In CLI domain modules, avoid direct `process.env`, stdout/stderr, stdin, or network reads outside service/boundary modules.
- Use public API tests for public behavior; use lower-level tests only for isolated edge cases. Pair this skill with `.agents/skills/testing` for test work.

## Verification

Run the narrowest relevant typecheck or package check while iterating. Before handoff for code changes, follow the full verification set in root `AGENTS.md`.
