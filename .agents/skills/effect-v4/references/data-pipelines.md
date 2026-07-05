# Data Pipelines with Stream, Sink, and Queue (Effect v4)

How to build data pipelines in Effect v4: creating streams from collections, paginated APIs, files, and callbacks; transforming and consuming them; concurrency, backpressure, batching, retries, resource safety, fan-out/merge; and Queue-based patterns like dead-letter queues.

## v3 → v4 quick map

| v3                                                          | v4                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Chunk` as pipeline currency (`runCollect` → `Chunk<A>`)    | plain arrays: `runCollect` → `Array<A>`, `grouped` → arrays                            |
| `Stream.paginateEffect(s, f)`                               | `Stream.paginate(s, f)` — effectful by default                                         |
| `Stream.repeatEffect` / `repeatEffectWithSchedule`          | `Stream.fromEffectRepeat` / `Stream.fromEffectSchedule`                                |
| `Stream.fromChunk(s)` / `mapChunks`                         | `Stream.fromArray(s)` / `Stream.mapArray`                                              |
| `Stream.acquireRelease`                                     | gone — `Stream.fromEffect(Effect.acquireRelease(...))` + `Stream.scoped`               |
| `Stream.broadcast(n, capacity)` → tuple                     | `Stream.broadcast(s, options)` → one multicast stream; `Stream.broadcastN` for a tuple |
| `Stream.partition(predicate)`                               | takes a `Filter` (`Filter.fromPredicate`); still returns `[excluded, satisfying]`      |
| `Stream.runFold(0, f)`                                      | initial value is lazy: `Stream.runFold(() => 0, f)`                                    |
| `NodeStream.fromReadable(() => r, onError)` positional args | `NodeStream.fromReadable({ evaluate, onError })` options object                        |

## Creating streams

Use `fromIterable`/`make`/`range` for in-memory sources, `paginate` for cursor APIs, `fromEffectSchedule` for polling, and `fromAsyncIterable` for async iterables. `Stream.paginate` is effectful in v4 and returns a page of values plus an optional next cursor.

```ts
import { Effect, Option, Schedule, Schema, Stream } from 'effect'

export const numbers = Stream.fromIterable([1, 2, 3, 4, 5])
// also: Stream.make("a", "b"), Stream.range(1, 100), Stream.fromArray(arr)

class PageError extends Schema.TaggedErrorClass<PageError>()('PageError', {
  message: Schema.String,
}) {}

declare const fetchPage: (
  cursor: number,
) => Effect.Effect<{ readonly items: ReadonlyArray<string>; readonly next: number | null }, PageError>

// One continuous stream over all pages; pages are fetched lazily on demand
export const allItems = Stream.paginate(0, (cursor) =>
  Effect.map(fetchPage(cursor), (page) => [page.items, Option.fromNullOr(page.next)] as const),
)

// Poll an effect on a schedule (v3 Stream.repeatEffectWithSchedule)
declare const readTemperature: Effect.Effect<number>
export const samples = Stream.fromEffectSchedule(readTemperature, Schedule.spaced('30 seconds'))

// Async iterables: thrown errors must be mapped to a typed error
class UpstreamError extends Schema.TaggedErrorClass<UpstreamError>()('UpstreamError', {
  cause: Schema.Defect(),
}) {}
declare const events: AsyncIterable<string>
export const eventStream = Stream.fromAsyncIterable(events, (cause) => new UpstreamError({ cause }))
```

- `Stream.paginate` stops when the cursor is `Option.none()`; return `[items, Option.some(next)]` to continue.
- v3 → v4: `Stream.paginateEffect` no longer exists; `Stream.paginate` took a pure function in v3 and is effectful in v4. Pages are `ReadonlyArray`, not `Chunk`.
- v3 → v4: `Option.fromNullable` was renamed — use `Option.fromNullOr` (null), `Option.fromUndefinedOr` (undefined), or `Option.fromNullishOr` (both).

### Callback-based sources

`Stream.callback` replaces all four v3 `Stream.async*` variants. You receive a `Queue` to push values into; register finalizers with `Effect.acquireRelease` for teardown.

```ts
import { Effect, Queue, Stream } from 'effect'

type Listener = (value: string) => void
declare const emitter: {
  on: (event: 'data', listener: Listener) => void
  off: (event: 'data', listener: Listener) => void
}

export const fromEmitter = Stream.callback<string>(
  Effect.fn(function* (queue) {
    const onData = (value: string) => {
      Queue.offerUnsafe(queue, value)
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => emitter.on('data', onData)),
      () => Effect.sync(() => emitter.off('data', onData)),
    )
  }),
  { bufferSize: 64, strategy: 'sliding' },
)
```

- Emit with `Queue.offerUnsafe` (sync contexts) or `Queue.offer`; finish with `Queue.endUnsafe(queue)`; fail with `Queue.fail` (or `Queue.failCauseUnsafe` from sync code — there is no `Queue.failUnsafe`).
- The registration effect runs in a `Scope` tied to the stream — `Effect.acquireRelease` finalizers run when the stream ends or is interrupted.

## Files and Node interop

The `FileSystem` service lives in core `"effect"`; the Node implementation layer is `NodeFileSystem.layer` from `"@effect/platform-node"`. Use `fs.stream(path)` for constant-memory file processing and `NodeStream.fromReadable` to wrap any Node `Readable`.

```ts
import { Effect, FileSystem, Schema, Stream } from 'effect'
import { NodeFileSystem, NodeStream } from '@effect/platform-node'
import { createReadStream } from 'node:fs'

export const countLines = Effect.fn('countLines')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs
    .stream(path, { chunkSize: FileSystem.KiB(64) })
    .pipe(Stream.decodeText(), Stream.splitLines, Stream.runCount)
})

export const main = countLines('./data.ndjson').pipe(Effect.provide(NodeFileSystem.layer))

// Wrapping an existing Node Readable stream
class ReadError extends Schema.TaggedErrorClass<ReadError>()('ReadError', {
  cause: Schema.Defect(),
}) {}

export const bytes = NodeStream.fromReadable({
  evaluate: () => createReadStream('./data.ndjson'),
  onError: (cause) => new ReadError({ cause }),
})
```

- `fs.stream` emits `Uint8Array` chunks and fails with `PlatformError`; the file handle is scoped to the stream — no manual cleanup.
- v3 → v4: there is no `@effect/platform` package. v3 `NodeStream.fromReadable(() => readable, onError)` became `NodeStream.fromReadable({ evaluate, onError })` (options object; `onError` is optional and defaults to wrapping in `Cause.UnknownError`).
- `Stream.decodeText()` is called (returns a pipe-able), `Stream.splitLines` is passed bare. For NDJSON/MsgPack framing see `Ndjson`/`Msgpack` in `"effect/unstable/encoding"` with `Stream.pipeThroughChannel`.

## Transforming

`map`/`filter` are pure, `mapEffect` is effectful with a `concurrency` option, `flatMap` substitutes a stream per element. In v4 the `map`/`mapEffect` callbacks also receive the element index.

```ts
import { Effect, Stream } from 'effect'

interface RawOrder {
  readonly id: string
  readonly status: 'paid' | 'refunded'
  readonly totalCents: number
}
interface Enriched extends RawOrder {
  readonly taxCents: number
}

declare const orders: Stream.Stream<RawOrder>
declare const lookupTax: (o: RawOrder) => Effect.Effect<Enriched>

export const pipeline = orders.pipe(
  Stream.filter((o) => o.status === 'paid'),
  Stream.map((o, i) => ({ ...o, position: i })),
  Stream.mapEffect(lookupTax, { concurrency: 8 }),
  Stream.tap((o) => Effect.log(`enriched ${o.id}`)),
  Stream.take(1000),
)

// flatMap: one stream per element, with bounded concurrent substreams
declare const linesOf: (o: RawOrder) => Stream.Stream<string>
export const allLines = orders.pipe(Stream.flatMap(linesOf, { concurrency: 4, bufferSize: 16 }))
```

- `mapEffect` preserves input order by default even with concurrency; pass `unordered: true` to emit in completion order (higher throughput).
- `Stream.mapArray`/`mapArrayEffect` (v3 `mapChunks`) transform whole internal chunks at once for hot paths.
- An error from `mapEffect` fails the whole stream and interrupts in-flight work — handle per-element errors inside the effect (see Retry and recovery).

## Consuming: run\* and Sinks

A stream does nothing until you run it. `runCollect` for bounded results, `runDrain` for effects-only pipelines, `runForEach` to consume element-by-element, `run` with a `Sink` for reusable terminal logic.

```ts
import { Effect, Sink, Stream } from 'effect'

interface Order {
  readonly id: string
  readonly totalCents: number
}
declare const orders: Stream.Stream<Order>

export const all = Stream.runCollect(orders) // Effect<Array<Order>> — bounded streams only
export const done = Stream.runDrain(orders) // Effect<void> — constant memory
export const logged = Stream.runForEach(orders, (o) => Effect.log(o.id))

// v4: the initial fold value is a thunk
export const revenue = orders.pipe(
  Stream.map((o) => o.totalCents),
  Stream.runFold(
    () => 0,
    (acc, n) => acc + n,
  ),
)

export const revenueViaSink = orders.pipe(
  Stream.map((o) => o.totalCents),
  Stream.run(Sink.sum),
)

export const first = Stream.runHead(orders) // Effect<Option<Order>>
```

- `runCollect` on an infinite/huge stream is an OOM bug — use `runDrain` or `runForEach` when you do not need the values.
- Other terminals: `runCount`, `runSum`, `runLast`, `Stream.mkString` (string streams), `Stream.toAsyncIterable` to hand a stream to non-Effect code.
- Useful sinks: `Sink.sum`, `Sink.count`, `Sink.head`, `Sink.last`, `Sink.forEach`, `Sink.fold`, `Sink.take(n)`.

## Concurrency, backpressure, and rate control

Streams are pull-based: a slow consumer automatically slows every upstream stage — backpressure is the default and needs no configuration. `buffer` decouples stages, `throttle` caps the rate, `debounce` waits for quiet periods.

```ts
import { Stream } from 'effect'

declare const sensor: Stream.Stream<number>

// Producer may run ahead by up to 64 elements; "suspend" (default) = backpressure
export const buffered = sensor.pipe(Stream.buffer({ capacity: 64 }))

// Lossy buffers for real-time data: "sliding" drops oldest, "dropping" drops newest
export const lossy = sensor.pipe(Stream.buffer({ capacity: 64, strategy: 'sliding' }))

// At most 10 elements per second; "shape" (default) delays, "enforce" drops
export const rateLimited = sensor.pipe(
  Stream.throttle({ cost: (chunk) => chunk.length, units: 10, duration: '1 second' }),
)

// Emit only after 300ms with no new elements
export const settled = sensor.pipe(Stream.debounce('300 millis'))
```

- Internally streams move chunks (plain arrays, up to `Stream.DefaultChunkSize` = 4096 elements). `throttle`'s `cost` receives the chunk, not one element. `Stream.rechunk(n)` resizes chunks after `buffer` destroys chunking.
- `{ capacity: "unbounded" }` exists but turns backpressure off entirely — prefer bounded capacities.
- v3 → v4: `Stream.bufferChunks` is now `Stream.bufferArray`.

## Batching

`grouped(n)` emits fixed-size batches; `groupedWithin(n, duration)` emits when the size **or** the time window is reached — ideal for bulk inserts that must also flush on idle.

```ts
import { Effect, Stream } from 'effect'

declare const userIds: Stream.Stream<number>
declare const bulkInsert: (batch: ReadonlyArray<number>) => Effect.Effect<void>

export const batched = userIds.pipe(
  Stream.grouped(100), // Stream<NonEmptyReadonlyArray<number>>
  Stream.mapEffect(bulkInsert, { concurrency: 2 }),
  Stream.runDrain,
)

export const timedBatches = userIds.pipe(
  Stream.groupedWithin(100, '1 second'), // size OR time, whichever first
  Stream.mapEffect(bulkInsert),
  Stream.runDrain,
)
```

- Batches are plain arrays in v4, not `Chunk`s: `grouped` emits `NonEmptyReadonlyArray<A>`, `groupedWithin` types its batches as `Array<A>`. The final batch may be smaller than `n`.
- For key-based grouping into substreams use `Stream.groupByKey(f)` (pure key) or `Stream.groupBy(f)` (effectful); both emit `[key, Stream<A>]` pairs.

## Retry and recovery

Decide the failure domain first: retry a single element's effect (pipeline keeps going) or retry the whole stream (it restarts from scratch). Stream errors are terminal — the first unhandled error halts the pipeline.

```ts
import { Effect, Schedule, Schema, Stream } from 'effect'

class ApiError extends Schema.TaggedErrorClass<ApiError>()('ApiError', {
  message: Schema.String,
}) {}

declare const fetchBatch: (page: number) => Effect.Effect<ReadonlyArray<string>, ApiError>

// Per-element resilience: retry the effect, then degrade — the stream survives
export const resilient = Stream.range(1, 50).pipe(
  Stream.mapEffect(
    (page) =>
      fetchBatch(page).pipe(
        Effect.retry(Schedule.exponential('100 millis').pipe(Schedule.jittered, Schedule.take(3))),
        Effect.catchTag('ApiError', () => Effect.succeed<ReadonlyArray<string>>([])),
      ),
    { concurrency: 4 },
  ),
  Stream.flattenIterable,
)

// Stream-level retry: re-runs the WHOLE stream from the start on each failure
declare const flaky: Stream.Stream<string, ApiError>
export const restarted = flaky.pipe(Stream.retry(Schedule.spaced('1 second').pipe(Schedule.take(5))))

// Recovery: v3 Stream.catchAll → v4 Stream.catch
export const recovered = flaky.pipe(Stream.catch(() => Stream.empty))
export const byTag = flaky.pipe(Stream.catchTag('ApiError', () => Stream.make('fallback')))
```

- `Stream.retry` resubscribes from the beginning — elements already emitted are emitted again downstream. For paginated/effectful sources that is usually wrong; prefer per-element `Effect.retry`.
- Compose schedules with `.pipe`: `Schedule.exponential(base)`, `Schedule.jittered`, `Schedule.take(n)` (limit attempts), `Schedule.both` (intersection).
- `Stream.catchTag` accepts a tag or a non-empty array of tags; `Stream.catchTags` takes a handler record. `Stream.orElseSucceed`/`orDie`/`ignore` also exist.

## Resource safety

v4 has no `Stream.acquireRelease`. Acquire resources with `Effect.acquireRelease` inside the stream, then eliminate the `Scope` with `Stream.scoped` — the release runs when the stream completes, fails, or is interrupted. `Stream.ensuring` adds a plain finalizer.

```ts
import { Effect, Stream } from 'effect'

interface Connection {
  readonly query: (sql: string) => Effect.Effect<ReadonlyArray<string>>
  readonly close: Effect.Effect<void>
}
declare const connect: Effect.Effect<Connection>

export const rows = Stream.fromEffect(Effect.acquireRelease(connect, (conn) => conn.close)).pipe(
  Stream.flatMap((conn) => Stream.fromIterableEffect(conn.query('select id from jobs'))),
  Stream.scoped,
)

declare const events: Stream.Stream<string>
export const withCleanup = events.pipe(
  Stream.ensuring(Effect.log('pipeline finished')),
  Stream.onExit((exit) => Effect.log(`exit: ${exit._tag}`)),
)
```

- `Stream.scoped` confines the `Scope` to the stream's own lifetime; without it the requirement leaks into `R` and the resource lives as long as the surrounding scope.
- `Stream.unwrap(effect)` builds a stream from an effect and also scopes acquisitions made while constructing it.
- Built-in sources (`fs.stream`, `NodeStream.fromReadable`, `Stream.callback` registrations) already manage their own resources.

## Merging streams

`merge` interleaves by arrival, `concat` sequences, `zip` pairs by position, `mergeAll` flattens many streams with bounded concurrency.

```ts
import { Stream } from 'effect'

declare const clicks: Stream.Stream<string>
declare const keys: Stream.Stream<string>

// haltStrategy: "both" (default) | "either" | "left" | "right"
export const interleaved = Stream.merge(clicks, keys, { haltStrategy: 'either' })

declare const sources: Array<Stream.Stream<string>>
export const fannedIn = Stream.mergeAll(sources, { concurrency: 4 }) // options required

export const sequenced = Stream.concat(clicks, keys) // all of left, then right
export const paired = Stream.zip(clicks, keys) // [string, string]; ends with shorter
export const freshest = Stream.zipLatest(clicks, keys) // re-pair on every update
```

## Fan-out: broadcast, partition, groupByKey

`broadcast` multicasts one source to many consumers via an internal PubSub; `partition` splits one stream in two by a `Filter`. Both return an `Effect` that needs a `Scope` (use `Effect.scoped`), and consumers must run concurrently.

```ts
import { Effect, Filter, Stream } from 'effect'

// v4 broadcast returns ONE multicast stream you can consume multiple times
export const stats = Effect.scoped(
  Effect.gen(function* () {
    const shared = yield* Stream.broadcast(Stream.range(1, 100), {
      capacity: 16,
      replay: 16,
    })
    return yield* Effect.all([Stream.runSum(shared), Stream.runCount(shared)], { concurrency: 'unbounded' })
  }),
)

// broadcastN returns a fixed-size tuple, subscribed upfront (no missed elements)
export const split = Effect.scoped(
  Effect.gen(function* () {
    const [forAudit, forMetrics] = yield* Stream.broadcastN(Stream.range(1, 100), {
      n: 2,
      capacity: 16,
    })
    yield* Effect.all([Stream.runForEach(forAudit, (n) => Effect.log(`audit ${n}`)), Stream.runSum(forMetrics)], {
      concurrency: 'unbounded',
    })
  }),
)

// partition: Filter-based routing; tuple order is [excluded, satisfying]
export const evensAndOdds = Effect.scoped(
  Effect.gen(function* () {
    const [odds, evens] = yield* Stream.partition(
      Stream.range(1, 10),
      Filter.fromPredicate((n: number) => n % 2 === 0),
    )
    yield* Effect.all([Stream.runDrain(odds), Stream.runDrain(evens)], {
      concurrency: 'unbounded',
    })
  }),
)
```

- v3 → v4 trap: v3 `Stream.broadcast(n, capacity)` returned a tuple — that is now `Stream.broadcastN({ n, capacity })`. v4 `Stream.broadcast` publishes as soon as the scope opens, so late subscribers miss elements unless you set `replay`.
- Both partition branches must be consumed concurrently — draining one while the other is unconsumed deadlocks once its buffer (`bufferSize`, default 16) fills.
- `Stream.groupByKey(f)` fans out to a dynamic substream per key; `Stream.share` multicasts with a refcounted upstream — it starts with the first consumer and stops after the last one exits (`idleTimeToLive` keeps it warm between consumers).

## Queues and dead-letter queues

v4 `Queue<A, E>` is the old `Mailbox`: it carries a typed failure channel and a completion signal (`Cause.Done`). `Queue.make` is unbounded by default; pass `capacity` and a strategy for bounded behavior.

```ts
import { Cause, Effect, Queue } from 'effect'

export const queueBasics = Effect.gen(function* () {
  const queue = yield* Queue.make<string, Cause.Done>({
    capacity: 64,
    strategy: 'suspend', // backpressure; also "dropping" | "sliding"
  })

  yield* Queue.offer(queue, 'job-1')
  yield* Queue.offerAll(queue, ['job-2', 'job-3'])

  const next = yield* Queue.take(queue) // waits for one element
  const batch = yield* Queue.takeAll(queue) // waits, then drains the buffer
  const maybe = yield* Queue.poll(queue) // Option<A>, never waits

  yield* Queue.end(queue) // completion: E must include Cause.Done
  return { next, batch, maybe }
})
```

- v3 → v4 trap: `Queue.make<A, E>(options)` is the front door (`Queue.bounded`/`sliding`/`dropping`/`unbounded` exist as shorthands). `Queue.shutdown` ends immediately and discards buffered items; `Queue.end` lets buffered items drain first.
- After `end`, buffered items can still be taken; once the queue is empty, `take` fails with `Cause.Done`. `Queue.collect` gathers everything until done.
- Bridges: `Stream.fromQueue(queue)` (ends on `Cause.Done`), `Stream.runIntoQueue(stream, queue)` to feed a queue (often forked with `Effect.forkChild`), `Stream.toQueue(stream, options)` (scoped).

### Dead-letter queue pipeline

Route exhausted failures to a DLQ so one poison message cannot kill the pipeline, while keeping the error context for inspection or reprocessing.

```ts
import { Cause, Effect, Queue, Schedule, Schema, Stream } from 'effect'

class JobError extends Schema.TaggedErrorClass<JobError>()('JobError', {
  jobId: Schema.String,
  message: Schema.String,
}) {}

interface Job {
  readonly id: string
  readonly payload: string
}
interface DeadLetter {
  readonly job: Job
  readonly error: JobError
}

declare const processJob: (job: Job) => Effect.Effect<void, JobError>

export const runPipeline = Effect.fn('runPipeline')(function* (jobs: ReadonlyArray<Job>) {
  const dlq = yield* Queue.make<DeadLetter, Cause.Done>()

  yield* Stream.fromIterable(jobs).pipe(
    Stream.mapEffect(
      (job) =>
        processJob(job).pipe(
          Effect.retry(Schedule.exponential('100 millis').pipe(Schedule.take(2))),
          Effect.catchTag('JobError', (error) => Queue.offer(dlq, { job, error })),
        ),
      { concurrency: 4 },
    ),
    Stream.runDrain,
  )

  yield* Queue.end(dlq)
  const failed = yield* Queue.collect(dlq)
  yield* Effect.log(`done; ${failed.length} jobs in DLQ`)
  return failed
})
```

- The `catchTag` is what keeps the stream alive: an unhandled `mapEffect` error halts everything and interrupts in-flight jobs.
- For a persistent DLQ swap the in-memory `Queue` for a port backed by real storage; the pipeline shape stays the same.

## When Stream is overkill: Effect.forEach

For a bounded in-memory collection where you just need "run this effect per item with limited concurrency", `Effect.forEach` is simpler than a stream pipeline.

```ts
import { Effect, Schema } from 'effect'

class EmailError extends Schema.TaggedErrorClass<EmailError>()('EmailError', {
  to: Schema.String,
}) {}

declare const sendEmail: (to: string) => Effect.Effect<string, EmailError>

export const notifyAll = Effect.fn('notifyAll')(function* (recipients: ReadonlyArray<string>) {
  // Results keep input order; first failure interrupts the rest
  return yield* Effect.forEach(recipients, sendEmail, { concurrency: 5 })
})
```

- Pass `discard: true` to get `Effect<void>` and skip building the result array.
- `concurrency` accepts a number or `"unbounded"`; omitting it means sequential.
- Reach for `Stream` instead when the source is unbounded/lazy (files, APIs, queues), or when you need batching, buffering, throttling, or fan-out between stages.

## Deep dives

- Stream/Sink/Queue source of truth: `repos/effect-smol/packages/effect/src/Stream.ts`, `Sink.ts`, `Queue.ts`
- Runnable v4 examples: `repos/effect-smol/ai-docs/src/02_stream/`
- Rename maps: `repos/effect-smol/migration/v3-to-v4.md`
