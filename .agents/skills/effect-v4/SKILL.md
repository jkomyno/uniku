---
name: effect-v4
description: Guides Effect v4 TypeScript work for uniku. Use for any Effect work in packages/cli (which runs on effect@4.0.0-beta.x), evaluating v3-to-v4 API changes, or checking @effect/vitest v4 examples against the local repos/effect-smol source clone.
---

# Effect v4

The `uniku` CLI runs on Effect v4 (`effect@4.0.0-beta.x`, pinned exact — betas may break between releases, so never widen to `^` or `@beta` ranges, and keep `repos/effect-smol` in sync with the pinned beta when bumping).

Use `repos/effect-smol/` as the local source oracle for Effect v4. It is a read-only submodule; if it is missing, run `git submodule update --init repos/effect-smol`. At creation time that clone was `effect@4.0.0-beta.93` on `main`, but the checkout may move; inspect `repos/effect-smol/packages/effect/package.json` and `git -C repos/effect-smol rev-parse HEAD` before treating any version as current.

Effect v4 is NOT the Effect you know from training data (v3). Assume any remembered API name is wrong until verified — see the reference map below and the verification section at the bottom.

## Non-negotiables

- Sequence with `Effect.gen(function* () { ... })` + `yield*`. For functions that return Effects, use `Effect.fn("Name.method")(function* (...) { ... })` — never `(x) => Effect.gen(...)`, and never wrap an `Effect.fn` in `.pipe(...)` (pass extra combinators as additional `Effect.fn` arguments).
- Model expected failures as typed errors: `class E extends Schema.TaggedErrorClass<E>()("E", { ...fields }) {}`, raised with `return yield* new E({ ... })`.
- Services: `class Db extends Context.Service<Db, Shape>()("pkg/path/Db") {}` with an explicit `static readonly layer = Layer.effect(Db, ...)` returning `Db.of({ ... })`. v4 never auto-generates layers; wire dependencies with `Layer.provide`.
- No `async`/`await`, no `try`/`catch` in Effect code. Wrap fallible promises with `Effect.tryPromise({ try, catch })` — `Effect.promise` converts rejections into defects that bypass `Effect.catch`/`catchTag`.
- No `Date.now()`/`new Date()` (use `Clock`/`DateTime`), no `process.env` reads outside adapters (use `Config`), no `Math.random()` (use `Random`).
- Map domain errors at boundaries with `Match.type<E>()`/`Match.value(e)` + `Match.tag(...)` + `Match.exhaustive` so unhandled tags are compile errors.
- Never compare `error._tag` by hand (`if (error._tag === 'Foo')`, `expect(error._tag).toBe('Foo')`). Use the dedicated helper for the context: `Effect.catchTag`/`Effect.catchTags` in pipelines, `Match.tag` for branching, `Predicate.isTagged(e, 'Foo')` for standalone predicates (e.g. `Schedule` `while:`), and `assertInstanceOf(error, Foo)` from `@effect/vitest/utils` in tests (v4 tagged errors are classes). Narrowing an inner discriminated union that has no class or helper (e.g. `PlatformError`'s `reason._tag`) is the one accepted exception.

## Error modeling at infrastructure boundaries

Domain errors that wrap infrastructure failures (SQL, HTTP, file I/O) must preserve a live `cause` for tracing. Do not assume the schema-encoded `cause` is safe to publish: SQL and SDK errors can include bound params, headers, payloads, or other caller data in `error.message`.

```typescript
import { Schema, SchemaGetter } from 'effect'

class StorageError extends Schema.TaggedErrorClass<StorageError>()('StorageError', {
  cause: Schema.optionalKey(Schema.Defect()).pipe(
    Schema.encodeTo(Schema.optionalKey(Schema.Defect()), {
      decode: SchemaGetter.passthroughSupertype<Schema.Json, unknown>(),
      encode: SchemaGetter.omit(),
    }),
  ),
  message: Schema.String,
  operation: Schema.String,
}) {}

// Construct: pass the raw caught value directly — no sanitization
declare const caughtValue: unknown
const err = new StorageError({ cause: caughtValue, operation: 'enqueue', message: '...' })
```

**Why `cause` must stay:**

- `Cause.pretty(exit.cause, { renderErrorCause: true })` walks the `.cause` chain to produce `exception.stacktrace`. Without `cause` on the domain error, OTel traces show only the static domain message — the infrastructure root cause disappears.
- Public typed-error serialization must not expose raw infrastructure causes. Use `SchemaGetter.omit()` or an explicit redacted encoded shape for public errors; keep the raw cause only on the runtime instance.

**Never pre-sanitize the cause** at construction time (e.g. `cause: sanitizeCause(e)`). That strips the live runtime object and defeats `Cause.pretty`. Make the schema's encoded shape safe instead.

**At `Layer.catchCause` boundaries**, use `Cause.squash` to collapse a full `Cause<E>` to its most meaningful value:

```typescript
import { Cause, Context, Effect, Layer, Schema } from 'effect'

class StorageError extends Schema.TaggedErrorClass<StorageError>()('StorageError', {
  cause: Schema.Defect(),
  message: Schema.String,
  operation: Schema.String,
}) {}

class MyService extends Context.Service<MyService, { readonly query: Effect.Effect<void> }>()('MyService') {}

declare const layer: Layer.Layer<MyService, StorageError>

const guarded = layer.pipe(
  Layer.catchCause((cause) =>
    Layer.effect(
      MyService,
      Effect.fail(new StorageError({ cause: Cause.squash(cause), operation: 'layer init', message: '...' })),
    ),
  ),
)
```

`Cause.squash` handles typed failures, defects, and interrupts — always extracting a single meaningful value from the cause tree.

## Top v3 → v4 traps

| v3 (training-data habit)                                               | v4 (this codebase)                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Effect.catchAll` / `catchAllCause` / `catchAllDefect`                 | `Effect.catch` / `catchCause` / `catchDefect`                                                                                                                                         |
| `Either.right(x)` / `Either.left(e)`                                   | `Result.succeed(x)` / `Result.fail(e)` — Either is gone                                                                                                                               |
| `Context.Tag("Id")<Self, Shape>()`, `Effect.Service` + `.Default`      | `Context.Service<Self, Shape>()("Id")` + explicit `static layer`                                                                                                                      |
| `Schema.TaggedError`                                                   | `Schema.TaggedErrorClass` (`Data.TaggedError` still exists but its fields are not Schema-backed — this codebase uses `TaggedErrorClass`)                                              |
| `FiberRef.make` / `Effect.locally`                                     | `Context.Reference` + `Effect.provideService`                                                                                                                                         |
| `import { FileSystem } from "@effect/platform"`                        | `@effect/platform` is gone: `FileSystem`/`Path`/`Terminal`/`Config` from `"effect"`; http/persistence/process under `"effect/unstable/*"`; Node layers from `"@effect/platform-node"` |
| `Runtime<R>`, `Effect.runPromise(provided)`                            | `Runtime<R>` removed — `ManagedRuntime.make(layer)` for integration, `NodeRuntime.runMain`/`Layer.launch` for entrypoints                                                             |
| `Mailbox`; `Queue<A>` without an error channel                         | `Mailbox` is gone — one `Queue<A, E>` module: `Queue.make`, completion via `Queue.end`                                                                                                |
| `Stream.runCollect` → `Chunk`; `Stream.async*`                         | plain arrays everywhere; `Stream.callback`                                                                                                                                            |
| `Schema.Literal("a", "b")`, `Schema.Union(A, B)`, `Schema.Tuple(A, B)` | array forms: `Schema.Literals([...])`, `Schema.Union([...])`, `Schema.Tuple([...])`                                                                                                   |
| `Schema.String.pipe(Schema.minLength(3))`                              | `Schema.String.check(Schema.isMinLength(3))` — filters renamed `is*`, attached via `.check`                                                                                           |
| `Schema.transform(from, to, {...})` / `Schema.compose`                 | `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({...})))`                                                                                                               |
| `ParseError` / `ParseResult.*Formatter`                                | `SchemaError` (tag `"SchemaError"`, holds `.issue`) + `SchemaIssue` formatters                                                                                                        |
| `Schema.parseJson(S)`                                                  | `Schema.fromJsonString(S)`                                                                                                                                                            |
| `JSONSchema.make(S)`                                                   | `Schema.toJsonSchemaDocument(S)`                                                                                                                                                      |
| `Layer.scoped` / `Effect.async`                                        | `Layer.effect` / `Effect.callback`                                                                                                                                                    |

Full rename maps, behavioral changes (layer memoization, fiber keep-alive, structural equality, flattened `Cause`), and removed APIs: `references/v3-to-v4-changes.md`.

## Reference map

Open the file matching the task before writing code:

| File                                                              | Open when                                                                                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [v3-to-v4-changes.md](references/v3-to-v4-changes.md)             | Translating v3-style code; a remembered API name fails to resolve; before writing service, fork, or entrypoint code                            |
| [core-patterns.md](references/core-patterns.md)                   | Writing any service, layer, error, resource, entrypoint, or use case; ports/adapters; the "what not to do" list                                |
| [error-management.md](references/error-management.md)             | Failure handling: catch\*/match, defects vs expected errors, flattened Cause, Result, retries/timeouts with Schedule, error accumulation       |
| [data-pipelines.md](references/data-pipelines.md)                 | Stream creation/transform/consumption, concurrency and backpressure, batching, broadcast/partition, `Queue<A, E>`, dead-letter queues          |
| [platform.md](references/platform.md)                             | Env vars and Config/ConfigProvider, FileSystem, Path, child processes, KeyValueStore, Terminal, wiring Node services                           |
| [schema-basics.md](references/schema-basics.md)                   | Defining schemas: structs, literals, checks, optionality, unions, recursion, classes; decode/encode entrypoints                                |
| [schema-transformations.md](references/schema-transformations.md) | Transforming during decode, branded types, custom messages, SchemaError/SchemaIssue formatting, effectful validation, fallbacks                |
| [schema-json-http.md](references/schema-json-http.md)             | Decoding anything that crosses a process boundary: JSON strings/files, schema evolution, DB JSON columns, HTTP responses, web-standard formats |
| [schema-config-forms-ai.md](references/schema-config-forms-ai.md) | `Config.schema` + Redacted secrets, form-style validation (collect all issues, cross-field rules), JSON Schema for LLM structured output       |

## Repo-specific gotchas (learned during the v3→v4 port)

- **Deep-import `@effect/platform-bun`**: the package barrel re-exports `BunRedis`, which imports the `bun` builtin. The published CLI bin and vitest both run under Node, so import `@effect/platform-bun/BunRuntime` / `@effect/platform-bun/BunServices` directly, never the barrel.
- **`@effect/vitest` v4 must share the workspace vitest**: its dist imports `@vitest/runner` directly (undeclared), which pnpm resolves to the hoisted copy dictated by the root catalog. `packages/cli` must use `vitest: "catalog:"` (v4); pinning an older vitest in the package splits the runner instances and every `layer(...)` block fails with "Vitest failed to find the current suite".
- **`Command.runWith` renders `ShowHelp` itself** (help via `Console.log`, attached parse errors via `Console.error`) and then re-fails with the `ShowHelp` error. The entrypoint only maps errors to exit codes (`src/runtime/cli-failure.ts`); it must not re-render framework errors. A parent command without a handler fails with `ShowHelp({ errors: [] })` → exit 0.
- **Built-in global flags own `-h`/`-v`** (help/version) plus `--completions` and `--log-level`. A subcommand-local flag with the same alias wins at its own command level (see `unstable/cli/SEMANTICS.md`), which is how `uniku uuid -v 7` still selects `--uuid-version`.

## Ground truth and verification

- The local Effect source at `repos/effect-smol/` is the only authority for what exists in v4: `packages/effect/src/<Module>.ts` (API surface), `migration/*.md` (v3→v4 guides), `LLMS.md` (idioms), `ai-docs/src/**` (runnable examples). It is read-only reference — never edit it and never import from `repos/**`.
- Before emitting an API you have not used in this session, confirm it: `grep -nE "(const|function|class|as) <name>\b" repos/effect-smol/packages/effect/src/<Module>.ts` — anchoring on `export const` alone misses `export function` declarations and aliased exports such as `catch_ as catch`.
- Migration docs can drift from the checked-out source, and their rename maps are not exhaustive. When docs and source disagree, the source and the compiler win.
- Validate real changes with `pnpm typecheck` (and `pnpm lint:ci`, `pnpm test`, `pnpm build` before handoff).
- Every `ts` code block in this skill should compile against the Effect version declared by `repos/effect-smol/packages/effect/package.json`. After editing examples or refreshing the local clone, re-verify with `node .agents/skills/effect-v4/scripts/check-examples.mjs`.
