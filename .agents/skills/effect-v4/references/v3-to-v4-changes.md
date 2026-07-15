# Effect v3 → v4: What Changed

The core model (Effect, Layer, Stream, Schema) survives, but package layout, many high-traffic API names, services, errors, and Schema changed substantially — and several behaviors changed silently. Skim the tables when translating v3 habits; read the "Top traps" code blocks before writing any service, error, fiber, or Promise-interop code. Deep dives: `repos/effect/MIGRATION.md` and `repos/effect/migration/*.md`.

## Package consolidation and import paths

One package, one version. `@effect/platform`, `@effect/rpc`, `@effect/cluster`, `@effect/experimental`, and `@effect/cli` no longer exist — their modules moved into core `effect` or `effect/unstable/*`. Platform-specific packages remain (`@effect/platform-node`, `@effect/sql-*`, `@effect/ai-*`, `@effect/opentelemetry`, `@effect/vitest`) and share the same version number as `effect`.

| v3 import                                                        | v4 import                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `effect/Either`                                                  | gone — use `effect/Result`                                                       |
| `effect/FiberRef`                                                | gone — use `effect/References` + `Context.Reference`                             |
| `effect/ParseResult`                                             | `effect/SchemaIssue`, `effect/SchemaParser`                                      |
| `effect/Mailbox`                                                 | `effect/Queue` (v4 Queue has an error channel + done signal)                     |
| `effect/TestClock`, `effect/FastCheck`                           | `effect/testing/TestClock`, `effect/testing/FastCheck`                           |
| STM modules `effect/TRef`, `effect/TQueue`, `effect/TMap`, ...   | `effect/TxRef`, `effect/TxQueue`, `effect/TxHashMap`, ... (`T*` → `Tx*`)         |
| `@effect/platform/FileSystem` / `Path` / `Terminal` / `Error`    | `effect/FileSystem` / `effect/Path` / `effect/Terminal` / `effect/PlatformError` |
| `@effect/platform/HttpClient`, `FetchHttpClient`, `Headers`, ... | `effect/unstable/http/*`                                                         |
| `@effect/platform/HttpApi*`, `OpenApi`                           | `effect/unstable/httpapi/*`                                                      |
| `@effect/platform/KeyValueStore`                                 | `effect/unstable/persistence/KeyValueStore`                                      |
| `@effect/platform/Command` / `CommandExecutor`                   | `effect/unstable/process/ChildProcess` / `ChildProcessSpawner`                   |
| `@effect/platform/Worker*` / `Socket`                            | `effect/unstable/workers/*` / `effect/unstable/socket/*`                         |
| `@effect/cli/*`                                                  | `effect/unstable/cli/*` (`Options` → `Flag`, `Args` → `Argument`)                |
| `@effect/rpc/*`                                                  | `effect/unstable/rpc/*`                                                          |
| `@effect/cluster/*`                                              | `effect/unstable/cluster/*`                                                      |
| `@effect/sql/*` (SqlClient, Statement, Migrator, ...)            | `effect/unstable/sql/*` (driver packages stay separate: `@effect/sql-pg`, ...)   |
| `@effect/experimental/DevTools`                                  | `effect/unstable/devtools/*`                                                     |
| `@effect/platform-node` `NodeContext.layer`                      | `@effect/platform-node` `NodeServices.layer`                                     |

- Node-specific layers stay in `@effect/platform-node`: `NodeFileSystem`, `NodePath`, `NodeRuntime`, `NodeServices`, `NodeTerminal`, `NodeHttpClient`, `NodeHttpServer`, `NodeChildProcessSpawner`, `NodeSocket`, ...
- `effect/unstable/*` modules may break in minor releases; everything else follows semver.
- New core modules with no v3 counterpart: `Filter`, `Latch`, `Semaphore`, `Optic`, `Newtype`, `SchemaGetter`, `SchemaTransformation`, `SchemaRepresentation`, `TxChunk`, `Stdio`.

## High-traffic API renames

### Effect module

| v3                                              | v4                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Effect.catchAll`                               | `Effect.catch`                                                                                                |
| `Effect.catchAllCause`                          | `Effect.catchCause`                                                                                           |
| `Effect.catchAllDefect`                         | `Effect.catchDefect`                                                                                          |
| `Effect.catchSome`                              | `Effect.catchFilter` (uses the `Filter` module; `Effect.catchIf` exists unchanged for predicates/refinements) |
| `Effect.catchSomeCause`                         | `Effect.catchCauseFilter` (`Effect.catchCauseIf` exists unchanged)                                            |
| `Effect.catchSomeDefect`                        | removed                                                                                                       |
| `Effect.catchTag` / `catchTags`                 | unchanged — `catchTag` also accepts an array of tags                                                          |
| `Effect.tapErrorCause`                          | `Effect.tapCause`                                                                                             |
| `Effect.async`                                  | `Effect.callback`                                                                                             |
| `Effect.either`                                 | `Effect.result` (returns `Result`)                                                                            |
| `Effect.zipRight`                               | `Effect.andThen`                                                                                              |
| `Effect.zipLeft`                                | `Effect.tap`                                                                                                  |
| `Effect.fork`                                   | `Effect.forkChild`                                                                                            |
| `Effect.forkDaemon`                             | `Effect.forkDetach`                                                                                           |
| `Effect.forkScoped` / `forkIn`                  | unchanged (all `fork*` gain an options object)                                                                |
| `Effect.forkAll`, `Effect.forkWithErrorHandler` | removed — fork individually, observe via `Fiber.join`                                                         |
| `Effect.ignoreLogged`                           | `Effect.ignore`                                                                                               |
| `Effect.optionFromOptional`                     | `Effect.catchNoSuchElement`                                                                                   |
| `Effect.makeSemaphore` / `makeLatch`            | `Semaphore.make` / `Latch.make` (own modules)                                                                 |
| `Effect.locally(eff, fiberRef, v)`              | `Effect.provideService(eff, SomeReference, v)`                                                                |
| `Effect.Tag`, `Effect.Service`                  | gone — `Context.Service` (see traps below)                                                                    |
| `Effect.gen(this, f)`                           | `Effect.gen({ self: this }, f)`                                                                               |
| `Effect.runtime<R>()` + `Runtime.runFork(rt)`   | `Effect.context<R>()` + `Effect.runForkWith(services)`                                                        |

New in v4: `Effect.fromOption` / `Effect.fromResult` (explicit conversions), `Effect.catchReason` / `catchReasons` / `unwrapReason` (handle a tagged `reason` field inside a tagged error), `Effect.catchEager`.

### Either → Result

The `Either` module is gone. `Result` is the v4 equivalent, with success-biased naming:

| v3                                        | v4                                      |
| ----------------------------------------- | --------------------------------------- |
| `Either.Either<R, L>`                     | `Result.Result<A, E>`                   |
| `Either.right(a)` / `Either.left(e)`      | `Result.succeed(a)` / `Result.fail(e)`  |
| `Either.isRight` / `Either.isLeft`        | `Result.isSuccess` / `Result.isFailure` |
| `either.right` / `either.left` (fields)   | `result.success` / `result.failure`     |
| `Either.match`                            | `Result.match`                          |
| `Effect.either(eff)`                      | `Effect.result(eff)`                    |
| `Schema.Either` / `Schema.EitherFromSelf` | `Schema.Result`                         |

### Services and Context

| v3                                                     | v4                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Context.GenericTag<T>(id)`                            | `Context.Service<T>(id)`                                                                        |
| `Context.Tag(id)<Self, Shape>()`                       | `Context.Service<Self, Shape>()(id)` — type params first, id second                             |
| `Effect.Tag(id)<Self, Shape>()` + static accessors     | `Context.Service<Self, Shape>()(id)`; accessors removed — use `yield*` or `Svc.use((s) => ...)` |
| `Effect.Service<Self>()(id, { effect, dependencies })` | `Context.Service<Self>()(id, { make })` — no auto `.Default` layer, no `dependencies`           |
| `MyService.Default` / `.Live` layer naming             | convention: `MyService.layer` (variants: `layerTest`, ...)                                      |
| `Context.Reference<Self>()(id, { defaultValue })`      | `Context.Reference<T>(id, { defaultValue })`                                                    |

### Layer and Scope

| v3                    | v4                                        |
| --------------------- | ----------------------------------------- |
| `Layer.scoped`        | `Layer.effect` (handles `Scope` directly) |
| `Layer.scopedDiscard` | `Layer.effectDiscard`                     |
| `Layer.tapErrorCause` | `Layer.tapCause`                          |
| `Scope.extend`        | `Scope.provide`                           |

### Cause: flattened, exceptions renamed

`Cause<E>` is no longer a recursive tree. It is `{ reasons: ReadonlyArray<Reason<E>> }` with only three reason variants: `Fail | Die | Interrupt`. `Empty`, `Sequential`, and `Parallel` are gone — an empty cause is an empty array; composition concatenates arrays (`Cause.combine`).

| v3                                                                          | v4                                                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `switch (cause._tag)` recursion                                             | iterate `cause.reasons`, switch on `reason._tag`                                          |
| `Cause.isFailType` / `isDieType` / `isInterruptType`                        | `Cause.isFailReason(r)` / `isDieReason(r)` / `isInterruptReason(r)`                       |
| `Cause.isFailure` / `isDie` / `isInterrupted` / `isInterruptedOnly`         | `Cause.hasFails` / `hasDies` / `hasInterrupts` / `hasInterruptsOnly`                      |
| `Cause.failureOption`                                                       | `Cause.findErrorOption`                                                                   |
| `Cause.failures(c)` / `Cause.defects(c)`                                    | `c.reasons.filter(Cause.isFailReason)` / `...isDieReason`                                 |
| `Cause.sequential` / `Cause.parallel`                                       | `Cause.combine`                                                                           |
| `Cause.NoSuchElementException`, `TimeoutException`, `UnknownException`, ... | `Cause.NoSuchElementError`, `TimeoutError`, `UnknownError`, ... (`*Exception` → `*Error`) |
| `Cause.RuntimeException`, `InterruptedException`                            | removed                                                                                   |

### Stream

| v3                                                           | v4                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `Stream.async` / `asyncEffect` / `asyncPush` / `asyncScoped` | `Stream.callback`                                                          |
| `Stream.fromChunk` / `fromChunks`                            | `Stream.fromArray` / `fromArrays`                                          |
| `Stream.mapChunks` / `mapChunksEffect`                       | `Stream.mapArray` / `mapArrayEffect`                                       |
| `Stream.repeatEffect` / `repeatEffectWithSchedule`           | `Stream.fromEffectRepeat` / `Stream.fromEffectSchedule`                    |
| `Stream.catchAll` / `catchAllCause` / `catchSome`            | `Stream.catch` / `catchCause` / `catchFilter` (`catchIf` exists unchanged) |
| `Stream.either` / `mergeEither`                              | `Stream.result` / `mergeResult`                                            |
| `Stream.flattenChunks` / `bufferChunks` / `zipWithChunks`    | `Stream.flattenArray` / `bufferArray` / `zipWithArray`                     |

### Data module

`Data.Class`, `Data.TaggedClass`, `Data.Error`, `Data.TaggedError`, and `Data.taggedEnum` survive. `Data.struct`, `Data.tuple`, `Data.array`, and `Data.case` are gone — unnecessary now that `Equal.equals` is structural by default (see behavioral changes). For schema-backed errors prefer `Schema.TaggedErrorClass`.

## Top traps (v3 habits that produce broken v4 code)

### 1. Services: `Context.Tag` is gone — use `Context.Service` and write layers explicitly

No auto-generated `.Default` layer, no `dependencies` option, no static accessor proxies. Define the class, attach a `static layer`, wire dependencies with `Layer.provide`.

```ts
import { Context, Effect, Layer } from 'effect'

export class Db extends Context.Service<
  Db,
  {
    readonly findJob: (id: string) => Effect.Effect<string>
  }
>()('uniku/Db') {
  static readonly layer = Layer.effect(
    Db,
    Effect.gen(function* () {
      yield* Effect.log('connecting')
      return Db.of({
        findJob: (id) => Effect.succeed(`job:${id}`),
      })
    }),
  )
}

const program = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.findJob('42')
}).pipe(Effect.provide(Db.layer))

// One-off access without a generator (prefer yield* in most code):
const oneOff = Db.use((db) => db.findJob('7'))
```

- v3 → v4: `Context.Tag("Db")<Db, Shape>()` → `Context.Service<Db, Shape>()("Db")` — type parameters first, id string second.
- The id string should be globally unique; convention: `"package/path/Name"`.
- v3 `Effect.Service` accessors (`Db.findJob(...)` as a static) do not exist; emit `yield* Db` then call methods.
- Access the service type with `Db["Service"]`, not a separate interface export.

### 2. Errors: `Schema.TaggedErrorClass`, `Effect.catch`, `Effect.catchTag` with arrays

`Data.TaggedError` still exists, but the idiomatic v4 custom error is schema-backed. `Effect.catchAll` no longer exists.

```ts
import { Effect, Schema } from 'effect'

export class QueueFullError extends Schema.TaggedErrorClass<QueueFullError>()('QueueFullError', {
  capacity: Schema.Number,
}) {}

export class JobParseError extends Schema.TaggedErrorClass<JobParseError>()('JobParseError', {
  message: Schema.String,
}) {}

declare const enqueue: Effect.Effect<void, QueueFullError | JobParseError>

// catchTag accepts a single tag or an array of tags (v4)
const handled = enqueue.pipe(
  Effect.catchTag(['QueueFullError', 'JobParseError'], (e) => Effect.log(`recovered: ${e._tag}`)),
)

const fallback = enqueue.pipe(
  Effect.catchTag('QueueFullError', (e) => Effect.log(`queue full at ${e.capacity}`)),
  Effect.catch((e) => Effect.log(`parse failure: ${e.message}`)), // v3: Effect.catchAll
)

// Errors are yieldable — always `return yield*` so TS knows control flow stops
const failing = Effect.gen(function* () {
  return yield* new QueueFullError({ capacity: 100 })
})
```

- v3 → v4: `Schema.TaggedError` → `Schema.TaggedErrorClass`; `Data.TaggedError` remains for non-schema errors.
- Wrap unknown causes with a `cause: Schema.Defect()` field (see trap 5).
- For errors with a nested tagged `reason` field, v4 adds `Effect.catchReason` / `catchReasons` / `unwrapReason`.

### 3. `Ref`, `Deferred`, `Fiber`, `Option` are no longer Effects — yieldable types changed

v3 made many types structural subtypes of `Effect`; v4 removes that. Service classes, `Context.Reference` values, `Config`, and tagged errors remain yieldable inside `Effect.gen`. Everything else needs an explicit conversion: `Ref`, `Deferred`, and `Fiber` via their module functions; `Option` and `Result` via `Effect.fromOption` / `Effect.fromResult` (they only `yield*` inside their own `Option.gen` / `Result.gen`).

```ts
import { Deferred, Effect, Fiber, Option, Ref } from 'effect'

const program = Effect.gen(function* () {
  const ref = yield* Ref.make(0)
  const count = yield* Ref.get(ref) // v3: yield* ref

  const deferred = yield* Deferred.make<string>()
  yield* Deferred.succeed(deferred, 'done')
  const value = yield* Deferred.await(deferred) // v3: yield* deferred

  const fiber = yield* Effect.forkChild(Effect.succeed(1)) // v3: Effect.fork
  const joined = yield* Fiber.join(fiber) // v3: yield* fiber

  // v3: yield* Option.some(42) — v4: convert explicitly
  const n = yield* Effect.fromOption(Option.some(42)) // fails with NoSuchElementError on None

  return [count, value, joined, n] as const
})
```

- Passing an `Option`/`Result` directly to Effect combinators (`Effect.map(Option.some(1), ...)`) no longer compiles either; always convert with `Effect.fromOption` / `Effect.fromResult`.
- This was an intentional bug-prevention change: `Effect.all([ref1, ref2])` silently _reading_ refs in v3 is now a type error.

### 4. Functions returning Effects: `Effect.fn`, never `.pipe()` on it

Do not write `(x) => Effect.gen(function* () {...})`. Use `Effect.fn("Name.method")` — it adds stack traces and a tracing span. Extra combinators go as additional arguments to `Effect.fn`, **not** via `.pipe()` on the result.

```ts
import { Effect } from 'effect'

export const processJob = Effect.fn('JobRunner.processJob')(
  function* (jobId: string) {
    yield* Effect.log(`processing ${jobId}`)
    return jobId.length
  },
  // additional combinators as extra args — do NOT .pipe() an Effect.fn
  Effect.annotateLogs({ component: 'job-runner' }),
)
```

- Annotate the return type when needed with `Effect.fn.Return<A, E, R>` as the generator's return type annotation.
- Inside service implementations, name methods `"ServiceName.method"`.

### 5. Promise interop: `Effect.promise` turns rejections into defects

`Effect.promise` is only for promises that _cannot_ reject — a rejection becomes a defect (untyped, skips `catch`/`catchTag`, crashes through your error handling). Use `Effect.tryPromise` for anything fallible. Never use `async`/`await` or `try`/`catch` inside Effect code.

```ts
import { Effect, Schema } from 'effect'

export class FetchError extends Schema.TaggedErrorClass<FetchError>()('FetchError', {
  cause: Schema.Defect(),
}) {}

declare const fetchJson: () => Promise<unknown>

// TRAP: rejection here becomes a DEFECT — invisible to Effect.catch / catchTag
const asDefect = Effect.promise(() => fetchJson())

// Correct for fallible promises: typed failure channel
const asFailure = Effect.tryPromise({
  try: () => fetchJson(),
  catch: (cause) => new FetchError({ cause }),
})
```

- `Effect.tryPromise(() => p)` without `catch` fails with `Cause.UnknownError` (v3: `UnknownException`).

### 6. Running programs: `Runtime<R>` is gone

`Runtime<R>` no longer exists; a plain `Context<R>` plays its role. Entrypoints use `NodeRuntime.runMain` or `Layer.launch`; framework integration uses `ManagedRuntime`.

```ts
import { Effect, Layer, ManagedRuntime } from 'effect'
import { NodeRuntime } from '@effect/platform-node'

const main = Effect.log('queue worker started')

// Process entrypoint: SIGINT/SIGTERM handling, exit codes, error reporting
NodeRuntime.runMain(main)

// Long-running app structured as a Layer
declare const AppLayer: Layer.Layer<never>
const runApp = Layer.launch(AppLayer)

// Embedding Effect into non-Effect code (HTTP handlers, callbacks, tests)
const runtime = ManagedRuntime.make(Layer.empty)
const handler = (): Promise<void> => runtime.runPromise(Effect.log('handling request'))
```

- v3 `Effect.runtime<R>()` + `Runtime.runFork(rt)` → `Effect.context<R>()` + `Effect.runForkWith(services)(effect)`.
- The `Runtime` module now only holds process-teardown utilities (`Teardown`, `makeRunMain`).
- Dispose `ManagedRuntime` with `runtime.dispose()` when the host application shuts down.

## Behavioral changes that silently break code

### Layer memoization is shared across `Effect.provide` calls

- v3: each `Effect.provide` had its own memo map — providing the same layer twice built it **twice**. v4: one shared memo map — it builds **once**. Code that relied on duplicate builds (e.g. two independent pools from one layer) changes behavior silently.
- Opt out per layer with `Layer.fresh(layer)`, or per provide with `Effect.provide(layer, { local: true })` (new in v4; isolates the whole subtree — use for test isolation).
- Still prefer composing layers once and providing once; the shared memo map is a safety net, not a composition strategy.

### Fiber keep-alive is built into the runtime

- v3: a fiber suspended on e.g. `Deferred.await` with an empty event loop let the Node process exit; only `runMain` kept it alive. v4: the runtime holds a reference-counted keep-alive timer — `Effect.runPromise` alone keeps the process running until the fiber settles.
- Consequence: programs that "conveniently" exited in v3 now hang until the fiber completes or is interrupted. Don't leak forever-suspended fibers.
- `NodeRuntime.runMain` is still recommended for entrypoints (signals, exit codes, error reporting).

### Forked fibers start deferred

- All `fork*` variants accept `{ startImmediately?: boolean, uninterruptible?: boolean | "inherit" }`. By default the forked fiber's start is deferred — do not assume it has begun executing when `forkChild` returns. Pass `{ startImmediately: true }` when ordering matters.

### Equality is structural by default

- v3: `Equal.equals({ a: 1 }, { a: 1 })` → `false` (reference). v4 → `true`; plain objects, arrays, `Map`, `Set`, `Date`, `RegExp` compare by value. This changes `HashMap`/`HashSet` key behavior for plain objects.
- `Equal.equals(NaN, NaN)` is now `true`.
- Opt out per object with `Equal.byReference(obj)` (proxy) or `Equal.byReferenceUnsafe(obj)` (marks the object).
- Rename: `Equal.equivalence()` → `Equal.asEquivalence()`. `Schema.Data` and `Data.struct` are removed because they are no longer needed.

### Cause is a flat array

- Recursive `Cause` folds (`Sequential`/`Parallel` handling, `reduce`, tree matching) must be rewritten over `cause.reasons` (see rename table above). The sequential/parallel distinction is not representable anymore.
- `Cause.findError` / `findDefect` return `Result`, not `Option` — use `findErrorOption` for the `Option` form.

### `Effect.gen` `this` argument

- `Effect.gen(this, function* () {...})` → `Effect.gen({ self: this }, function* () {...})`.

## FiberRef → Context.Reference

`FiberRef` and `FiberRefs` are removed (`Differ` survives as a standalone diff/patch module, no longer tied to FiberRef). Fiber-local state is a `Context.Reference` — a service with a default value. Built-ins live in the `References` module: `CurrentConcurrency`, `CurrentLogLevel`, `MinimumLogLevel`, `CurrentLogAnnotations`, `CurrentLogSpans`, `CurrentLoggers`, `LogToStderr`, `TracerEnabled`, `TracerSpanAnnotations`, `UnhandledLogLevel`.

```ts
import { Context, Effect, References } from 'effect'

// Read: yield* the reference directly (v3: FiberRef.get(fiberRef))
const readLevel = Effect.gen(function* () {
  return yield* References.CurrentLogLevel
})

// Scoped write (v3: Effect.locally / FiberRef.set) — provide it like any service
declare const myEffect: Effect.Effect<void>
const debugged = Effect.provideService(myEffect, References.CurrentLogLevel, 'Debug')

// Custom fiber-local / defaulted config value
const MaxRetries = Context.Reference<number>('uniku/MaxRetries', {
  defaultValue: () => 3,
})

const usesRetries = Effect.gen(function* () {
  return yield* MaxRetries
})
```

- There is no mutable `FiberRef.set` equivalent — values are scoped to the effect you provide them to. Restructure "set then continue" code into "provide around the region".
- Log level values are plain strings; the full `LogLevel` union is `"All" | "Fatal" | "Error" | "Warn" | "Info" | "Debug" | "Trace" | "None"` (note `"Warn"`, not `"Warning"`; `"All"`/`"None"` are filtering bounds for `MinimumLogLevel`).

## Schema v4 is a rewrite — do not assume any v3 Schema API survived

Schema changed more than any other module. Always check before emitting Schema code; see the dedicated Schema reference files in this skill (start with [schema-basics.md](schema-basics.md)), and `repos/effect/migration/schema.md` for the full v3 → v4 map. The highest-traffic changes:

| v3                                                         | v4                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Schema.TaggedError`                                       | `Schema.TaggedErrorClass`                                                                                |
| `schema.annotations({...})`                                | `schema.annotate({...})`                                                                                 |
| `Schema.Union(A, B)` / `Tuple(A, B)` / `Literal("a", "b")` | array args: `Union([A, B])` / `Tuple([A, B])` / `Literals(["a", "b"])`                                   |
| `Schema.Record({ key, value })`                            | `Schema.Record(key, value)`                                                                              |
| `Schema.decodeUnknown` / `decode`                          | `Schema.decodeUnknownEffect` / `decodeEffect`                                                            |
| `Schema.decodeUnknownEither`                               | `Schema.decodeUnknownExit` (or `decodeUnknownResult`)                                                    |
| `Schema.filter(pred)`                                      | `schema.check(Schema.makeFilter(pred))`; refinements: `Schema.refine`                                    |
| `Schema.pattern` / `minLength` / `int` / ...               | `is*` checks: `check(Schema.isPattern(...))`, `isMinLength`, `isInt`, ...                                |
| `Schema.pick("a")` / `omit("a")` / `partial` / `extend`    | `schema.mapFields(Struct.pick(["a"]))` / `Struct.omit` / `Struct.map(Schema.optional)` / `Struct.assign` |
| `Schema.transform(from, to, {...})`                        | `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({...})))`                                  |
| `Schema.parseJson(schema)`                                 | `Schema.fromJsonString(schema)`                                                                          |
| `Schema.compose`                                           | `Schema.decodeTo`                                                                                        |
| `Schema.validate*`                                         | removed — `decode*` + `Schema.toType`                                                                    |
| `Schema.Data`                                              | removed (structural equality is default)                                                                 |
| parse failures: `ParseError`                               | `Schema.SchemaError` wrapping a `SchemaIssue` (format via `SchemaIssue` module)                          |

```ts
import { Schema } from 'effect'

const Job = Schema.Struct({
  id: Schema.String,
  attempts: Schema.Number,
  status: Schema.Literals(['pending', 'running', 'done']), // v3: Schema.Literal("pending", ...)
})

const decodeJob = Schema.decodeUnknownEffect(Job) // v3: Schema.decodeUnknown(Job)
```

## Removed with no direct replacement

- `Effect.forkAll`, `Effect.forkWithErrorHandler`, `Effect.catchSomeDefect`
- `FiberRef`, `FiberRefs`, `FiberRefsPatch`, `Runtime<R>` (`Differ` still exists as a standalone module)
- `Cause.RuntimeException`, `Cause.InterruptedException`, sequential/parallel cause structure
- `Data.struct`, `Data.tuple`, `Data.array`, `Data.case`
- `Schema.Data`, `Schema.validate*`, `Schema.keyof`, `Schema.withDefaults`
- Service accessor proxies (v3 `Effect.Tag` statics) — use `yield*` or `Service.use`
