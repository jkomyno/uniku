# Effect v4 core patterns

Canonical patterns for Effect v4: generators, `Effect.fn`, services, layers, tagged errors, resource safety, entrypoints, and the port/adapter layout.

## Ground rules

- Import from `"effect"` (one package: `Effect`, `Layer`, `Context`, `Schema`, `Match`, `Config`, `Stream`, `Queue`, `Schedule`, ...). There is **no `@effect/platform`** in v4; Node-specific layers (`NodeRuntime`, `NodeFileSystem`, `NodePath`, `NodeServices`, ...) come from `"@effect/platform-node"`. Pre-stable modules live under `"effect/unstable/*"` (`effect/unstable/http`, `effect/unstable/sql`, ...).
- Gone in v4: `Either` → `Result` (`Result.succeed` / `Result.fail`; `Option` remains), `FiberRef` → `Context.Reference` (built-ins in the `References` module), `Runtime<R>` → `ManagedRuntime` for integration plus `NodeRuntime.runMain` / `Layer.launch` for entrypoints.
- No `async`/`await`, no `try`/`catch` in Effect code. No `Date.now()` (use `Clock`), no `process.env` outside config/adapters (use `Config`).
- Schema v4 is a full rewrite — never assume a v3 Schema API survived; check `repos/effect/migration/schema.md` first.

## Effect.gen + yield\*

Write sequential effectful logic with `Effect.gen`, accessing results with `yield*`. Attach extra behavior with `.pipe(...)` on the resulting Effect.

```ts
import { Effect, Schema } from 'effect'

class FileReadError extends Schema.TaggedErrorClass<FileReadError>()('FileReadError', {
  path: Schema.String,
}) {}

declare const readFile: (path: string) => Effect.Effect<string, FileReadError>

export const loadConfig = Effect.gen(function* () {
  yield* Effect.log('loading config')
  const text = yield* readFile('config.json')
  if (text.length === 0) {
    // Always `return yield*` when raising, so TS knows the function stops here
    return yield* new FileReadError({ path: 'config.json' })
  }
  return text
}).pipe(
  Effect.catch((error) => Effect.succeed(`fallback for ${error.path}`)),
  Effect.withSpan('loadConfig'),
)
```

- Tagged error instances are yieldable: `yield* new FileReadError({...})` fails the effect.
- v3 → v4: `Effect.catchAll` → `Effect.catch`, `Effect.catchAllCause` → `Effect.catchCause`, `Effect.catchAllDefect` → `Effect.catchDefect`, `Effect.catchSome` → `Effect.catchFilter` (`Effect.catchIf` exists unchanged), `Effect.async` → `Effect.callback`, `Effect.either` → `Effect.result`.

## Effect.fn — functions that return Effects

Any function returning an Effect should be `Effect.fn("Name.method")(function* (...) {...})`, not `(x) => Effect.gen(...)`. The string names the tracing span (via `Effect.withSpan`) and improves stack traces. Extra combinators are passed as **additional arguments** — never `.pipe()` the result of `Effect.fn`.

```ts
import { Effect, Schema } from 'effect'

class QueueFullError extends Schema.TaggedErrorClass<QueueFullError>()('QueueFullError', {
  capacity: Schema.Number,
}) {}

declare const capacity: number
declare const size: Effect.Effect<number>

export const enqueue = Effect.fn('Queue.enqueue')(
  // Effect.fn.Return<A, E, R> optionally pins the generator's return type
  function* (payload: string): Effect.fn.Return<string, QueueFullError> {
    const current = yield* size
    if (current >= capacity) {
      return yield* new QueueFullError({ capacity })
    }
    yield* Effect.log('enqueued', payload)
    return payload
  },
  // extra combinators go HERE, as arguments — never .pipe on Effect.fn
  Effect.annotateLogs({ component: 'queue' }),
)
```

- `Effect.fn(name)` also accepts a plain function returning an Effect: `Effect.fn("X.y")((n: number) => Effect.succeed(n))`.
- `.pipe()` on an `Effect.fn` value is wrong: it pipes the _function_, not the Effect per call. Pass combinators as trailing arguments instead.
- Inside object literals, annotate parameter types explicitly (`function* (id: string)`) — contextual inference does not flow through `Effect.fn`.

## Services — Context.Service + static layer + .of()

Define a service by extending `Context.Service<Self, Shape>()("id")`. Attach the canonical implementation as a `static readonly layer` built with `Layer.effect`, returning `Self.of({...})`. v4 does **not** auto-generate layers.

```ts
import { Context, Effect, Layer, Schema } from 'effect'

export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()('DatabaseError', {
  cause: Schema.Defect(),
}) {}

export class Database extends Context.Service<
  Database,
  {
    query(sql: string): Effect.Effect<ReadonlyArray<unknown>, DatabaseError>
  }
>()(
  // id convention: package + path to the service file
  'myapp/db/Database',
) {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const query = Effect.fn('Database.query')(function* (sql: string) {
        yield* Effect.log('executing', sql)
        return [] as ReadonlyArray<unknown>
      })
      return Database.of({ query })
    }),
  )
}

// Consume with yield*; the dependency appears in R
export const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.query('select 1')
})
```

- v3 → v4: `Context.Tag("Id")<Self, Shape>()` → `Context.Service<Self, Shape>()("Id")` (type params first, id last). `Effect.Tag` accessors are gone — `yield*` the service (or `Database.use((db) => ...)` sparingly). `Effect.Service`'s auto `.Default` layer and `dependencies` option are gone — write `static layer` explicitly and wire deps with `Layer.provide`.
- Naming convention: `layer` (plus variants like `layerNoDeps`, `layerInMemory`), not v3's `Default`/`Live`.
- Expected failures belong in the method signatures (the `E` channel) — they are part of the service contract.
- Need the shape type? Use `Database["Service"]`.

## Context.Reference — config-like services with defaults

Use `Context.Reference<T>(id, { defaultValue })` for values that should always resolve: feature flags, tunables, request metadata. Consumers `yield*` it like any service; no layer is required unless you want to override the default.

```ts
import { Context, Duration, Effect, Layer } from 'effect'

export const PollInterval = Context.Reference<Duration.Duration>('myapp/PollInterval', {
  defaultValue: () => Duration.seconds(30),
})

export const poll = Effect.gen(function* () {
  const interval = yield* PollInterval // falls back to the default
  yield* Effect.sleep(interval)
})

// Override per call site or via a layer
export const fastPoll = poll.pipe(Effect.provideService(PollInterval, Duration.millis(10)))
export const FastPollLayer = Layer.succeed(PollInterval, Duration.millis(10))
```

- v3 → v4: `FiberRef.make` → `Context.Reference`; built-in fiber refs are now references in the `References` module (`References.CurrentLogLevel`, `References.MinimumLogLevel`, ...); the v3 class form `Context.Reference<Self>()(id, opts)` became a plain function call `Context.Reference<T>(id, opts)`.

## Layer composition — provide, provideMerge, unwrap

Build small layers per service, then compose: `Layer.provide` wires a dependency and hides it; `Layer.provideMerge` wires it and also exposes it to downstream consumers; `Layer.unwrap` builds a layer from an Effect (e.g. choosing an implementation from `Config`).

```ts
import { Config, Context, Effect, Layer, Schema } from 'effect'

export class DbError extends Schema.TaggedErrorClass<DbError>()('DbError', {
  cause: Schema.Defect(),
}) {}

export class Db extends Context.Service<
  Db,
  {
    query(sql: string): Effect.Effect<ReadonlyArray<unknown>, DbError>
  }
>()('myapp/Db') {
  static readonly layer = Layer.effect(
    Db,
    Effect.gen(function* () {
      const url = yield* Config.string('DATABASE_URL') // may fail: ConfigError
      yield* Effect.log('connecting', url)
      return Db.of({ query: () => Effect.succeed([]) })
    }),
  )

  static readonly layerInMemory = Layer.succeed(Db, Db.of({ query: () => Effect.succeed([]) }))

  // Pick the implementation at startup from config
  static readonly layerFromEnv = Layer.unwrap(
    Effect.gen(function* () {
      const inMemory = yield* Config.boolean('DB_IN_MEMORY').pipe(Config.withDefault(false))
      return inMemory ? Db.layerInMemory : Db.layer
    }),
  )
}

export class UserRepository extends Context.Service<
  UserRepository,
  {
    exists(id: string): Effect.Effect<boolean, DbError>
  }
>()('myapp/UserRepository') {
  // Requires Db — visible in the layer's R type
  static readonly layerNoDeps: Layer.Layer<UserRepository, never, Db> = Layer.effect(
    UserRepository,
    Effect.gen(function* () {
      const db = yield* Db
      return UserRepository.of({
        exists: Effect.fn('UserRepository.exists')(function* (id: string) {
          const rows = yield* db.query(`select 1 from users where id = ${id}`)
          return rows.length > 0
        }),
      })
    }),
  )

  // Db wired in and hidden
  static readonly layer = this.layerNoDeps.pipe(Layer.provide(Db.layer))

  // Db wired in AND still exposed to whoever uses this layer
  static readonly layerWithDb = this.layerNoDeps.pipe(Layer.provideMerge(Db.layer))
}
```

- v3 → v4: `Layer.scoped` → `Layer.effect` (it absorbs `Scope` now) and `Layer.scopedDiscard` → `Layer.effectDiscard`.
- Layers are memoized by reference: providing `Db.layer` twice yields one `Db` instance — in v4 even across separate `Effect.provide` calls (opt out with `Layer.fresh` or `Effect.provide(layer, { local: true })`).
- Config failures surface in the layer's error channel — let them propagate to the entrypoint instead of defaulting silently.

## Tagged errors — Schema.TaggedErrorClass + catch combinators

Define every expected failure as a tagged error class; fields are Schema-validated and instances are yieldable. Handle by tag with `Effect.catchTag` (one tag or an array) or `Effect.catchTags` (object of handlers); `Effect.catch` handles whatever remains. The full failure-handling treatment (defects, flattened `Cause`, `Result`, retries, accumulation) is in [error-management.md](error-management.md).

```ts
import { Effect, Schema } from 'effect'

export class ParseError extends Schema.TaggedErrorClass<ParseError>()('ParseError', {
  input: Schema.String,
}) {}

export class ReservedPort extends Schema.TaggedErrorClass<ReservedPort>()('ReservedPort', {
  port: Schema.Number,
}) {}

declare const loadPort: (input: string) => Effect.Effect<number, ParseError | ReservedPort>

// one tag ("ParseError") or an array of tags
export const manyTags = loadPort('80').pipe(Effect.catchTag(['ParseError', 'ReservedPort'], () => Effect.succeed(3000)))

// an object of per-tag handlers; Effect.catch handles whatever remains
export const perTag = loadPort('80').pipe(
  Effect.catchTags({
    ParseError: () => Effect.succeed(3000),
    ReservedPort: (e) => Effect.succeed(e.port + 1),
  }),
)
```

- v3 → v4: `Schema.TaggedError` → `Schema.TaggedErrorClass<Self>()("Tag", fields)`; `Data.TaggedError` still exists but its fields are not Schema-backed — prefer `TaggedErrorClass`. Use `Schema.ErrorClass` only when you do not want a `_tag`.
- Use `cause: Schema.Defect()` for wrapped unknown causes (caught exceptions, rejections).
- Wrap lower-level errors when crossing a service boundary: `Effect.mapError((reason) => new RepoError({ reason }))` — pass it as an extra `Effect.fn` argument or pipe it onto the inner effect.

## Exhaustive boundary mapping with Match

At the edge (HTTP handler, CLI, worker shell), map the domain error union exhaustively with `Match`. `Match.exhaustive` makes an unhandled tag a **compile error**, so adding a new domain error forces every boundary to decide.

```ts
import { Effect, Match, Schema } from 'effect'

export class JobNotFound extends Schema.TaggedErrorClass<JobNotFound>()('JobNotFound', {
  id: Schema.String,
}) {}

export class QueueClosed extends Schema.TaggedErrorClass<QueueClosed>()('QueueClosed', {
  queue: Schema.String,
}) {}

export type AppError = JobNotFound | QueueClosed

export const toStatusCode: (error: AppError) => number = Match.type<AppError>().pipe(
  Match.tag('JobNotFound', () => 404),
  Match.tag('QueueClosed', () => 409),
  Match.exhaustive, // ← compile error if a tag has no case
)

declare const runJob: Effect.Effect<string, AppError>

export const handled = runJob.pipe(Effect.mapError((error) => ({ status: toStatusCode(error) })))
```

- Never end a domain-union matcher with `Match.orElse(() => 500)` — it silently swallows future error tags. Reserve `orElse` for genuinely open unions.
- `Match.tag` accepts multiple tags before the handler: `Match.tag("A", "B", () => ...)`.

## Resource safety — Effect.acquireRelease + Scope

Acquire with `Effect.acquireRelease(acquire, release)`; the release runs exactly once when the owning `Scope` closes, even on failure or interruption. A `Layer.effect` owns the scope of resources acquired inside it — they are released when the layer is torn down (runtime disposal / process shutdown). For a local lifetime, close over the region with `Effect.scoped`.

```ts
import { Context, Effect, Layer, Schema } from 'effect'

interface Connection {
  readonly send: (msg: string) => Promise<void>
  readonly close: () => void
}
declare const connect: () => Connection

export class SendError extends Schema.TaggedErrorClass<SendError>()('SendError', {
  cause: Schema.Defect(),
}) {}

export class Transport extends Context.Service<
  Transport,
  {
    send(msg: string): Effect.Effect<void, SendError>
  }
>()('myapp/Transport') {
  static readonly layer = Layer.effect(
    Transport,
    Effect.gen(function* () {
      // released when the layer's scope closes
      const conn = yield* Effect.acquireRelease(
        Effect.sync(() => connect()),
        (conn) => Effect.sync(() => conn.close()),
      )
      const send = Effect.fn('Transport.send')((msg: string) =>
        Effect.tryPromise({
          try: () => conn.send(msg),
          catch: (cause) => new SendError({ cause }),
        }),
      )
      return Transport.of({ send })
    }),
  )
}
```

- `Effect.acquireRelease` adds `Scope` to `R`; something must discharge it: `Layer.effect`, `Effect.scoped`, or an explicit `Scope.provide(scope)` (renamed from v3's `Scope.extend`).
- Fallible promise APIs go through `Effect.tryPromise({ try, catch })` so failures land in `E` as tagged errors — never `Effect.promise` (see "What not to do").

## Entrypoints — NodeRuntime.runMain + Layer.launch

For executables, build the whole app as a Layer and run `Layer.launch` under `NodeRuntime.runMain`. `runMain` installs signal handlers, reports failures, and runs all finalizers on shutdown; `Layer.launch` builds the layer and stays alive until interrupted (its type is `Effect<never, ...>`).

```ts
import { Effect, Layer } from 'effect'
import { NodeRuntime } from '@effect/platform-node'

const Worker = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Effect.log('worker starting')
    yield* Effect.forkScoped(
      Effect.gen(function* () {
        while (true) {
          yield* Effect.log('tick')
          yield* Effect.sleep('1 second')
        }
      }),
    )
  }),
)

NodeRuntime.runMain(Layer.launch(Worker))
```

- `Layer.effectDiscard` runs setup effects (background fibers via `Effect.forkScoped`) without exposing a service.
- For a finite script, pass a plain Effect: `NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)))`.

## Integration — ManagedRuntime

When an external framework owns the process (web server, queue consumer, test harness), build **one** `ManagedRuntime` from the process-scoped layer and call `runtime.runPromise` per invocation. Request-scoped values are provided per call, never baked into the runtime layer.

```ts
import { Context, Effect, Layer, ManagedRuntime } from 'effect'

export const RequestId = Context.Reference<string>('myapp/RequestId', {
  defaultValue: () => 'anonymous',
})

export class Greeter extends Context.Service<
  Greeter,
  {
    greet(name: string): Effect.Effect<string>
  }
>()('myapp/Greeter') {
  static readonly layer = Layer.succeed(
    Greeter,
    Greeter.of({
      greet: Effect.fn('Greeter.greet')(function* (name: string) {
        const requestId = yield* RequestId
        return `[${requestId}] hello ${name}`
      }),
    }),
  )
}

// process-scoped: build once, reuse for every request
const runtime = ManagedRuntime.make(Greeter.layer)

// called from non-Effect code (framework handler, callback, ...)
export const handle = (requestId: string, name: string): Promise<string> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const greeter = yield* Greeter
      return yield* greeter.greet(name)
    }).pipe(Effect.provideService(RequestId, requestId)), // request-scoped, per call
  )

// on framework shutdown
export const shutdown = (): Promise<void> => runtime.dispose()
```

- v3 → v4: `Runtime<R>` is gone (no `Effect.runtime<R>()` / `Runtime.runFork(runtime)`); use `ManagedRuntime` here, or `Effect.context<R>()` + `Effect.runForkWith(services)` inside Effect code.
- Layers inside one `ManagedRuntime` are built once and memoized; `dispose()` runs all finalizers (releases `acquireRelease` resources).
- Use `Effect.provideServiceEffect(Key, effect)` when the per-request value itself comes from an Effect.

## Ports and adapters

Domain code declares **ports** as `Context.Service` classes (interface + tagged errors only — no infrastructure types in the shape). Infrastructure supplies **adapters** as Layers; tests use in-memory adapters. Use cases are `Effect.fn`/`Effect.gen` programs over ports, with dependencies tracked in `R`.

```ts
import { Context, Effect, Layer, Schema } from 'effect'

interface Job {
  readonly id: string
  readonly payload: string
}

export class JobNotFound extends Schema.TaggedErrorClass<JobNotFound>()('JobNotFound', {
  id: Schema.String,
}) {}

// Port (domain) — the error type is part of the contract
export class JobRepository extends Context.Service<
  JobRepository,
  {
    findById(id: string): Effect.Effect<Job, JobNotFound>
    save(job: Job): Effect.Effect<void>
  }
>()('myapp/ports/JobRepository') {}

export class IdGenerator extends Context.Service<
  IdGenerator,
  {
    readonly next: Effect.Effect<string>
  }
>()('myapp/ports/IdGenerator') {}

// Adapter (infrastructure or testkit) — a Layer implementing the port
export const JobRepositoryInMemory = Layer.effect(
  JobRepository,
  Effect.sync(() => {
    const store = new Map<string, Job>()
    return JobRepository.of({
      findById: Effect.fn('JobRepository.findById')(function* (id: string) {
        const job = store.get(id)
        return job ?? (yield* new JobNotFound({ id }))
      }),
      save: (job) => Effect.sync(() => void store.set(job.id, job)),
    })
  }),
)

// Use case (application) — pure orchestration over ports
export const submitJob = Effect.fn('submitJob')(function* (payload: string) {
  const repo = yield* JobRepository
  const ids = yield* IdGenerator
  const id = yield* ids.next
  const job: Job = { id, payload }
  yield* repo.save(job)
  return job
})
```

- A real adapter `yield*`s its own infrastructure services (db client, clock, http) inside its `Layer.effect` and hides them with `Layer.provide` — the port shape never mentions them.
- Decode external data at the adapter edge with Schema; never let raw rows or SDK payload types cross into domain code.
- Use cases stay free of `process.env`, SDK imports, and runtime construction — those belong to adapters and the entrypoint.

## What not to do

- **`Effect.promise` for fallible promises.** It turns rejections into _defects_ that bypass `Effect.catch`/`catchTag`. Always `Effect.tryPromise({ try, catch })` mapping to a tagged error; reserve `Effect.promise` for promises that genuinely cannot reject.
- **`async`/`await` or `try`/`catch` inside Effect code.** Use `Effect.gen` + `yield*` and the `catch*` combinators; wrap promise APIs at the adapter edge with `Effect.tryPromise`.
- **`.pipe()` on an `Effect.fn`.** It composes the function value, not each returned Effect. Pass combinators as extra arguments to `Effect.fn`.
- **`(x) => Effect.gen(function* () {...})`.** Use `Effect.fn("Name")(function* (x) {...})` — you get a span and better stack traces for free.
- **Reading `process.env` (or `Date.now`) outside adapters.** Use `Config.*` inside layers and `Clock` for time; domain code receives values via services.
- **Non-exhaustive error mapping at boundaries.** A `Match.orElse` fallback (or a `default` branch) hides new error tags; end domain-union matchers with `Match.exhaustive`.
- **v3 API muscle memory.** `Effect.catchAll`, `Context.Tag`, `Effect.Service` + `.Default`, `Either.*`, `FiberRef.*`, `Layer.scoped`, `@effect/platform` imports — all gone or renamed. When unsure, check `repos/effect/migration/v3-to-v4.md`.
