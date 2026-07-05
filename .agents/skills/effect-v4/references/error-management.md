# Error Management in Effect v4

How to define, raise, recover from, transform, and accumulate errors in Effect v4. Covers tagged errors via `Schema.TaggedErrorClass`, the renamed `catch*` family (`Effect.catch`, `catchTag` with tag arrays, `catchTags`), v4-only reason-based errors (`catchReason`/`catchReasons`/`unwrapReason`), the flattened `Cause` model, `Result` (the v4 replacement for `Either`), retries/timeouts with `Schedule`, and error accumulation (`mode: "result"`, `Effect.partition`, `Effect.validate`). Deep dives: `repos/effect-smol/migration/error-handling.md`, `repos/effect-smol/migration/cause.md`.

## Defining typed errors

Define domain errors as classes extending `Schema.TaggedErrorClass`. Instances are yieldable: `yield*` an error instance to fail. Always `return yield*` when raising, so TypeScript knows the function stops there.

```ts
import { Effect, Schema } from 'effect'

export class UserNotFoundError extends Schema.TaggedErrorClass<UserNotFoundError>()('UserNotFoundError', {
  userId: Schema.String,
}) {}

// Wrap an unknown underlying cause with Schema.Defect()
export class DbError extends Schema.TaggedErrorClass<DbError>()('DbError', { cause: Schema.Defect() }) {}

export const findUser = Effect.fn('findUser')(function* (userId: string) {
  if (userId === 'missing') {
    return yield* new UserNotFoundError({ userId })
  }
  return { userId, name: 'Alice' }
})
// (userId: string) => Effect.Effect<{ userId: string; name: string }, UserNotFoundError>
```

- **v3 → v4**: the idiomatic base is `Schema.TaggedErrorClass<X>()("X", { ...fields })` with Schema fields — not `Data.TaggedError("X")<{ ...types }>`. `Data.TaggedError` still exists, but prefer the Schema form: it gives serializable, validated errors at boundaries.
- Field values are Schema values (`Schema.String`, `Schema.Number`, `Schema.Defect()`...), not TypeScript types.
- Errors carry `_tag` automatically; that tag drives `catchTag`/`catchTags`.

## Expected errors vs defects

Expected errors live in the `E` channel and are recoverable with `catch*`. Defects (from `Effect.die` or any `throw` inside Effect code) bypass `Effect.catch`/`catchTag` entirely and must be handled at the `Cause` level.

```ts
import { Cause, Effect, Schema } from 'effect'

class ParseError extends Schema.TaggedErrorClass<ParseError>()('ParseError', { message: Schema.String }) {}

// Expected failure: typed, shows up in E, recoverable
const expected = Effect.fail(new ParseError({ message: 'bad input' }))

// Defect: NOT in E, skips Effect.catch / catchTag
const defect = Effect.die('invariant violated')

// A throw inside Effect.sync / Effect.gen also becomes a defect
const alsoDefect = Effect.sync((): void => {
  throw new Error('boom')
})

// Fallible sync code: Effect.try takes { try, catch } and produces a typed failure
const parsed = Effect.try({
  try: () => JSON.parse('{') as unknown,
  catch: (error) => new ParseError({ message: String(error) }),
})

// Fallible async code: Effect.tryPromise. Plain-function form fails with
// Cause.UnknownError; the { try, catch } form gives a typed error.
declare const fetchJson: () => Promise<unknown>

const loose: Effect.Effect<unknown, Cause.UnknownError> = Effect.tryPromise(() => fetchJson())
const typed = Effect.tryPromise({
  try: () => fetchJson(),
  catch: (error) => new ParseError({ message: String(error) }),
})
```

- **Trap**: `Effect.promise(() => ...)` converts a rejected promise into a _defect_, not a typed failure. Use it only for promises that genuinely cannot fail; otherwise use `Effect.tryPromise`.
- Never use `try`/`catch` or `async`/`await` inside Effect code — raise with `return yield* new MyError(...)` and recover with combinators.
- **v3 → v4**: `Cause.UnknownException` is now `Cause.UnknownError`; the `Cause.*Exception` classes were renamed `Cause.*Error` (`TimeoutError`, `NoSuchElementError`, `IllegalArgumentError`, `ExceededCapacityError`), while `RuntimeException`, `InterruptedException`, and `InvalidPubSubCapacityException` were removed.

## Recovering: Effect.catch, catchTag, catchTags

`Effect.catch` handles every expected error; `Effect.catchTag` handles one tag or an array of tags; `Effect.catchTags` takes one handler per tag. Unhandled tags stay in the error channel.

```ts
import { Effect, Schema } from 'effect'

class ParseError extends Schema.TaggedErrorClass<ParseError>()('ParseError', { input: Schema.String }) {}
class ReservedPortError extends Schema.TaggedErrorClass<ReservedPortError>()('ReservedPortError', {
  port: Schema.Number,
}) {}

declare const loadPort: (input: string) => Effect.Effect<number, ParseError | ReservedPortError>

// Catch everything (v3: Effect.catchAll)
const fallback = loadPort('x').pipe(Effect.catch(() => Effect.succeed(3000)))

// Catch one tag; ParseError remains in E
const one = loadPort('x').pipe(Effect.catchTag('ReservedPortError', (e) => Effect.succeed(e.port + 1)))

// Catch several tags with one handler (array form)
const many = loadPort('x').pipe(Effect.catchTag(['ParseError', 'ReservedPortError'], () => Effect.succeed(3000)))

// One handler per tag
const perTag = loadPort('x').pipe(
  Effect.catchTags({
    ParseError: (e) => Effect.succeed(Number(e.input)),
    ReservedPortError: (e) => Effect.succeed(e.port + 1),
  }),
)
```

- **v3 → v4**: `catchAll` → `catch`, `catchAllCause` → `catchCause`, `catchAllDefect` → `catchDefect`, `catchSome` → `catchFilter`, `catchSomeCause` → `catchCauseFilter`, `catchSomeDefect` removed (`catchTag`/`catchTags`/`catchIf` keep their names). The v3 names do not compile. Full map in the table at the bottom.
- `Effect.catchTag(tag, handler, orElse?)` accepts an optional third argument that handles all _remaining_ errors, removing them from `E` as well.
- `Effect.tapErrorTag(tag, f)` observes a specific tag without recovering.

## Reason-based errors (new in v4)

A v4 idiom for wrapping a union of low-level causes inside one domain error: give the error a tagged `reason` field, then handle individual reasons with `Effect.catchReason`/`catchReasons`, or promote them into the error channel with `Effect.unwrapReason`.

```ts
import { Effect, Schema } from 'effect'

class RateLimitError extends Schema.TaggedErrorClass<RateLimitError>()('RateLimitError', {
  retryAfter: Schema.Number,
}) {}
class QuotaExceededError extends Schema.TaggedErrorClass<QuotaExceededError>()('QuotaExceededError', {
  limit: Schema.Number,
}) {}

class ProviderError extends Schema.TaggedErrorClass<ProviderError>()('ProviderError', {
  reason: Schema.Union([RateLimitError, QuotaExceededError]), // tagged "reason" field drives catchReason*
}) {}

declare const callProvider: Effect.Effect<string, ProviderError>

// Handle one reason; other reasons keep failing with ProviderError
const oneReason = callProvider.pipe(
  Effect.catchReason('ProviderError', 'RateLimitError', (reason) =>
    Effect.succeed(`retry after ${reason.retryAfter}s`),
  ),
)

// Handle several reasons at once
const manyReasons = callProvider.pipe(
  Effect.catchReasons('ProviderError', {
    RateLimitError: (reason) => Effect.succeed(`retry after ${reason.retryAfter}s`),
    QuotaExceededError: (reason) => Effect.succeed(`quota: ${reason.limit}`),
  }),
)

// Promote the reasons into the error channel, then use normal catch* combinators
const unwrapped = callProvider.pipe(
  Effect.unwrapReason('ProviderError'),
  Effect.catchTags({
    RateLimitError: (reason) => Effect.succeed(`backoff ${reason.retryAfter}s`),
    QuotaExceededError: (reason) => Effect.succeed(`limit ${reason.limit}`),
  }),
)
```

- Both `catchReason` and `catchReasons` accept an optional trailing catch-all handler `(reason, error) => Effect<...>` covering the remaining reasons (it also receives the original wrapping error).
- Prefer this over deeply nested `cause` chains when one boundary error can fail for several typed reasons.

## Mapping errors to fit your domain

Use `Effect.mapError` at layer boundaries so low-level errors do not leak into outer APIs. Use `Effect.tapError`/`Effect.tapCause` to observe without recovering.

```ts
import { Effect, Schema } from 'effect'

class ConnectionError extends Schema.TaggedErrorClass<ConnectionError>()('ConnectionError', {}) {}
class QueryError extends Schema.TaggedErrorClass<QueryError>()('QueryError', {}) {}
class RepositoryError extends Schema.TaggedErrorClass<RepositoryError>()('RepositoryError', {
  cause: Schema.Defect(),
}) {}

declare const dbQuery: Effect.Effect<{ name: string }, ConnectionError | QueryError>

const findUser: Effect.Effect<{ name: string }, RepositoryError> = dbQuery.pipe(
  Effect.tapError((error) => Effect.logWarning('db failure', error)),
  Effect.mapError((cause) => new RepositoryError({ cause })),
)
```

- **v3 → v4**: `Effect.tapErrorCause` is now `Effect.tapCause`.
- `Effect.orElseSucceed(() => value)` replaces any failure with a constant success.
- Map errors where the abstraction changes (repository, transport, API edge) — not after every call.

## Folding both channels: match, matchEffect, matchCause

`Effect.match` folds failure and success into plain values; `Effect.matchEffect` runs an Effect per branch; the `matchCause*` variants see defects and interruptions too.

```ts
import { Effect } from 'effect'

declare const compute: Effect.Effect<number, string>

const summary = compute.pipe(
  Effect.match({
    onFailure: (error) => `failed: ${error}`,
    onSuccess: (n) => `got: ${n}`,
  }),
) // Effect<string, never>

const logged = compute.pipe(
  Effect.matchEffect({
    onFailure: (error) => Effect.logError(`failed: ${error}`),
    onSuccess: (n) => Effect.log(`got: ${n}`),
  }),
)

const causeAware = compute.pipe(
  Effect.matchCauseEffect({
    onFailure: (cause) => Effect.logError('failed', cause),
    onSuccess: (n) => Effect.log(`got: ${n}`),
  }),
)
```

- There is no `Effect.matchTag`/`Effect.matchTags` — for per-tag recovery use `Effect.catchTags`; for general ADT branching use the `Match` module.
- `Effect.matchEager`/`matchCauseEffectEager` exist as performance variants for already-resolved effects; default to the plain forms.

## Conditional branching on success values

Validate inside a pipeline with `Effect.filterOrFail` (fail when the predicate rejects) or `Effect.filterOrElse` (switch to a fallback effect).

```ts
import { Effect, Schema } from 'effect'

class InactiveUserError extends Schema.TaggedErrorClass<InactiveUserError>()('InactiveUserError', {
  userId: Schema.String,
}) {}

interface User {
  readonly id: string
  readonly active: boolean
  readonly roles: ReadonlyArray<string>
}

declare const findUser: (id: string) => Effect.Effect<User>

const activeUser = (id: string) =>
  findUser(id).pipe(
    Effect.filterOrFail(
      (user) => user.active,
      (user) => new InactiveUserError({ userId: user.id }),
    ),
  ) // Effect<User, InactiveUserError>
```

- `Effect.filterOrFail(predicate)` without `orFailWith` fails with `Cause.NoSuchElementError`.
- `Effect.filterOrElse(predicate, orElse)` switches to a fallback effect instead of failing.
- Every branch in a `flatMap`/`gen` conditional must return an Effect — a bare `if` without `else` silently widens to `void` and breaks downstream types.

## Cause: flattened in v4

A v4 `Cause<E>` is a flat wrapper around `reasons: ReadonlyArray<Reason<E>>` where `Reason` is `Fail<E> | Die | Interrupt`. The v3 recursive tree (`Empty`, `Sequential`, `Parallel`) is gone — concurrent and finalizer failures are concatenated into one array.

```ts
import { Cause, Effect, Option } from 'effect'

declare const program: Effect.Effect<string, Cause.TimeoutError>

// Recover from the full cause: expected failures, defects, interruptions
const recovered = program.pipe(
  Effect.catchCause((cause) =>
    Effect.gen(function* () {
      for (const reason of cause.reasons) {
        switch (reason._tag) {
          case 'Fail':
            yield* Effect.logWarning('expected failure', reason.error)
            break
          case 'Die':
            yield* Effect.logError('defect (bug)', reason.defect)
            break
          case 'Interrupt':
            yield* Effect.logWarning('interrupted by fiber', reason.fiberId)
            break
        }
      }
      yield* Effect.logError(Cause.pretty(cause))
      return 'fallback'
    }),
  ),
)

// Recover from defects only (v3: Effect.catchAllDefect)
const defectsHandled = program.pipe(Effect.catchDefect((defect) => Effect.succeed(`recovered: ${String(defect)}`)))

// Move the whole Cause into the error channel for inspection
const sandboxed = Effect.sandbox(program) // Effect<string, Cause.Cause<Cause.TimeoutError>>

// Capture success/failure as an Exit value (never fails)
const exited = Effect.exit(program)

// Extractors on a Cause value
declare const cause: Cause.Cause<string>
const firstError: Option.Option<string> = Cause.findErrorOption(cause)
const failReasons = cause.reasons.filter(Cause.isFailReason)
const dieReasons = cause.reasons.filter(Cause.isDieReason)
```

- **v3 → v4**: `Cause.failures(cause)` → `cause.reasons.filter(Cause.isFailReason)`; `Cause.defects(cause)` → `cause.reasons.filter(Cause.isDieReason)`; `Cause.failureOption` → `Cause.findErrorOption`; `Cause.isFailure`/`isDie` → `Cause.hasFails`/`hasDies` (boolean checks). `Cause.findError`/`findDefect` return a `Result`, not an `Option`.
- Policy: recover/retry `Fail` reasons; log and escalate `Die` reasons (they are bugs); never swallow `Interrupt`.

## Option and Result (Either is GONE)

The v3 `Either` module does not exist in v4. Its replacement is `Result`, with success/failure vocabulary: `Result.succeed`/`Result.fail` (not `right`/`left`), variants `Success`/`Failure`, fields `.success`/`.failure`. Translate any v3 `Either` code accordingly. `Option` is unchanged.

```ts
import { Effect, Result } from 'effect'

const ok = Result.succeed(42) // v3: Either.right
const bad = Result.fail('nope') // v3: Either.left

declare const r: Result.Result<number, string>

const text = Result.match(r, {
  onFailure: (error) => `error: ${error}`, // v3: onLeft
  onSuccess: (n) => `value: ${n}`, // v3: onRight
})

if (Result.isSuccess(r)) {
  const n: number = r.success // v3: r.right
}
const orZero = Result.getOrElse(r, () => 0)

// Effect <-> Result / Option
declare const program: Effect.Effect<number, string>
const asResult = Effect.result(program) // v3: Effect.either
const asOption = Effect.option(program) // failure -> Option.none
const back = Effect.fromResult(ok)
```

- **v3 → v4**: `Either.isRight`/`isLeft` → `Result.isSuccess`/`isFailure`; `Either.match({ onLeft, onRight })` → `Result.match({ onFailure, onSuccess })`; `Stream.mergeEither` → `Stream.mergeResult`.

## Retries with Schedule

`Effect.retry` accepts either a `Schedule` or an options object `{ times, while, until, schedule }`. Use `while` to retry only on specific (transient) errors. Build backoff policies by composing Schedules.

```ts
import { Effect, Predicate, Schedule, Schema } from 'effect'

class ServerBusyError extends Schema.TaggedErrorClass<ServerBusyError>()('ServerBusyError', {}) {}
class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()('NotFoundError', {}) {}

declare const callApi: Effect.Effect<string, ServerBusyError | NotFoundError>

// Retry up to 3 times on any expected error
const simple = Effect.retry(callApi, { times: 3 })

// Retry only transient errors; NotFoundError fails immediately
const selective = Effect.retry(callApi, {
  while: Predicate.isTagged('ServerBusyError'),
  times: 3,
})

// Exponential backoff (100ms, 200ms, 400ms...) with jitter, max 5 retries.
// Schedule.both = intersection: stops as soon as either schedule stops.
const policy = Schedule.exponential('100 millis').pipe(Schedule.jittered, Schedule.both(Schedule.recurs(5)))
const resilient = Effect.retry(callApi, policy)

// Fallback once retries are exhausted
const withFallback = Effect.retryOrElse(callApi, Schedule.recurs(2), (error) =>
  Effect.succeed(`gave up: ${error._tag}`),
)
```

- **v3 → v4**: `Schedule.compose` / `Schedule.intersect` / `Schedule.union` / `Schedule.whileInput` / `Schedule.upTo` are gone. Use `Schedule.both` (AND / max delay), `Schedule.either` (OR / min delay), `Schedule.take(n)` to cap recurrences, `Schedule.andThen` to sequence, and the `while` retry option instead of input predicates.
- `Schedule.jittered` takes no arguments in v4 (scales each delay by a random 0.8–1.2 factor). v3's `Schedule.jittered(min, max)` form does not exist.
- The effect always runs once before the policy applies: `Schedule.recurs(3)` means up to 4 total attempts.
- Defects and interruptions are never retried — only expected errors.
- For repetition on _success_ use `Effect.repeat` with the same Schedule vocabulary.

## Timeouts (and composing with retry)

`Effect.timeout` interrupts the effect and adds `Cause.TimeoutError` to the error channel. Order matters: a timeout inside `retry` limits each attempt; outside, it caps the whole retry loop.

```ts
import { Cause, Effect, Predicate, Schedule, Schema } from 'effect'

class ApiError extends Schema.TaggedErrorClass<ApiError>()('ApiError', {}) {}

declare const fetchData: Effect.Effect<string, ApiError>

const limited: Effect.Effect<string, ApiError | Cause.TimeoutError> = fetchData.pipe(Effect.timeout('2 seconds'))

// Timeout per attempt, retry slow/busy attempts, then fall back
const resilient = fetchData.pipe(
  Effect.timeout('2 seconds'),
  Effect.retry({
    schedule: Schedule.exponential('100 millis').pipe(Schedule.both(Schedule.recurs(3))),
    while: Predicate.isTagged('TimeoutError'),
  }),
  Effect.catchTag('TimeoutError', () => Effect.succeed('fallback data')),
)
```

- **v3 → v4**: the failure is `Cause.TimeoutError` (tag `"TimeoutError"`), not `TimeoutException`.
- `Effect.timeoutOption(duration)` succeeds with `Option.none` on timeout instead of failing; `Effect.timeoutOrElse` runs a fallback effect.

## Error accumulation (collect instead of short-circuit)

By default `Effect.all` fails fast. To run everything and keep all outcomes, use `mode: "result"`, `Effect.partition`, or `Effect.validate`.

```ts
import { Effect, Result, Schema } from 'effect'

class ValidationError extends Schema.TaggedErrorClass<ValidationError>()('ValidationError', { field: Schema.String }) {}

declare const validateField: (field: string) => Effect.Effect<string, ValidationError>
const fields = ['name', 'email', 'age']

// 1. One Result per effect; the combined effect never fails (v3: { mode: "either" })
const allResults = Effect.all(
  fields.map((f) => validateField(f)),
  { mode: 'result', concurrency: 'unbounded' },
) // Effect<Array<Result.Result<string, ValidationError>>>

// 2. Partition into [failures, successes]; never fails
const partitioned = Effect.partition(fields, (f) => validateField(f))
// Effect<[excluded: Array<ValidationError>, satisfying: Array<string>]>

// 3. All-or-nothing: succeed with every value, or fail with ALL errors (v3: validateAll)
const validated = Effect.validate(fields, (f) => validateField(f))
// Effect<Array<string>, NonEmptyArray<ValidationError>>

const report = Effect.gen(function* () {
  const results = yield* allResults
  const errors = results.filter(Result.isFailure).map((r) => r.failure)
  const values = results.filter(Result.isSuccess).map((r) => r.success)
  yield* Effect.log(`${values.length} ok, ${errors.length} failed`)
  return { values, errors }
})
```

- **v3 → v4**: `Effect.all({ mode: "either" })` → `{ mode: "result" }` (yields `Result` values). `Effect.validateAll` → `Effect.validate`. There is no `mode: "validate"` on `Effect.all`.
- Under concurrency, multiple failures naturally collect into the flat `cause.reasons` array — no `Parallel` cause trees to traverse.
- Use accumulation for form validation, batch jobs, and health checks; keep fail-fast for pipelines where later steps depend on earlier ones.
