# Effect v4 core patterns

These are the patterns in `packages/cli/src`, not idealized examples. Each excerpt names
the file it came from. Read that file for full context: the source is compile-checked,
this reference is not.

## Services: `Context.Service` + an explicit `layer`

v4 has no `Effect.Service`, `Context.Tag`, or `Context.GenericTag`, and it does not
generate a layer. Define the service with `Context.Service` and build the layer yourself.
Every CLI service names its layer `layer`, from `packages/cli/src/services/OutputService.ts`:

```ts no-check
export class OutputService extends Context.Service<
  OutputService,
  {
    readonly write: (value: Render, options: OutputOptions) => Effect.Effect<void>
    readonly writeError: (value: Render, options: OutputOptions) => Effect.Effect<void>
  }
>()('uniku/cli/OutputService') {
  static readonly layer = Layer.succeed(
    OutputService,
    OutputService.of({
      write: (value, options) => Effect.sync(() => writeRecords(process.stdout, render(value, options))),
      writeError: (value, options) => Effect.sync(() => writeRecords(process.stderr, render(value, options))),
    }),
  )
}
```

The same shape, compiled:

```ts
import { Context, Effect, Layer } from 'effect'

export class Greeter extends Context.Service<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string> }
>()('uniku/cli/Greeter') {
  static readonly layer = Layer.succeed(
    Greeter,
    Greeter.of({ greet: (name) => Effect.succeed(`Hello, ${name}`) }),
  )
}

export const program = Effect.gen(function* () {
  const greeter = yield* Greeter
  return yield* greeter.greet('uniku')
}).pipe(Effect.provide(Greeter.layer))
```

Build service values with `X.of({...})`, including test mocks
(`packages/cli/__tests__/__utils__/services/`). The entrypoint merges the live layers once,
from `packages/cli/src/bin.ts`:

```ts no-check
const MainLayer = Layer.mergeAll(OutputService.layer, StdinService.layer, UpdateCheckService.layer, BunServices.layer)
```

## Errors: `Schema.TaggedError`

CLI-owned failures are schema-backed tagged errors, from `packages/cli/src/domain/errors.ts`:

```ts no-check
export class CliError extends Schema.TaggedError<CliError>()('CliError', {
  code: Schema.String,
  message: Schema.String,
  hint: Schema.optionalKey(Schema.String),
}) {
  readonly exitCode: number = 1
}
```

Raise one with `return yield* new CliError({ ... })` inside a generator, and recover with
`Effect.catchTag`, `Effect.catchTags`, `Match.tag`, or a `Predicate.isTagged` guard — never
a manual `error._tag === '...'` branch:

```ts
import { Effect, Schema } from 'effect'

class NotFound extends Schema.TaggedError<NotFound>()('NotFound', {
  id: Schema.String,
}) {}

const lookup = Effect.fn('lookup')(function* (id: string) {
  if (id.length === 0) {
    return yield* new NotFound({ id })
  }
  return id
})

export const recovered = lookup('').pipe(Effect.catchTag('NotFound', (error) => Effect.succeed(`missing ${error.id}`)))
```

When an error wraps an infrastructure failure, keep the raw value in a `cause:
Schema.Defect()` field so `Cause.pretty` can show it. Do not pre-sanitize it.

## Promise boundaries

`Effect.tryPromise({ try, catch })` for a Promise that can reject with an expected,
typed failure; `Effect.promise` only for Promises that cannot reject, because it turns a
rejection into a defect. Callback APIs (like stdin in
`packages/cli/src/services/StdinService.ts`) use `Effect.callback`. No `async`/`await` or
`try`/`catch` inside Effect code.

## `Effect.fn` vs `Effect.gen`

Both wrap a generator and re-run it on every execution. What differs is what the
expression is and what the tracer records:

- `Effect.gen(function* () {...})` produces an Effect **value**: the entrypoint `program`
  in `src/bin.ts`, or a module-level constant.
- `Effect.fn('span.name')(function* (...) {...})` produces a **function** whose effects
  carry stack frames and open a tracing span per call. This repo uses it for every function
  that returns an Effect: command handlers (`cli.generate.uuid`, `cli.validate`), parsers
  (`cli.generate.parseTimestamp`), and service members (`StdinService.readLines`). Do not
  write `(x) => Effect.gen(...)` in `packages/cli`.

A handler from `packages/cli/src/commands/inspect/inspect.handler.ts`:

```ts no-check
export const runInspect = Effect.fn('cli.inspect')(function* ({ id, type, json }: InspectParams) {
  const output = yield* OutputService

  const result = inspectId(id, Option.getOrUndefined(type))
  if (!result) {
    return yield* new CliError({
      code: 'UNKNOWN_ID_TYPE',
      message: `Could not identify ID type for: "${id}"`,
      hint: 'Use --type to specify the ID type',
    })
  }

  yield* output.write(inspectOutput(result), { json })
})
```

## `Option`: combinators, not `isSome` ternaries

Optional flags and arguments arrive as `Option` values. Transform them with the module's
combinators rather than unwrapping with `Option.isSome(x) ? … x.value … : …`:

| Instead of                                                          | Write                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Option.isSome(o) ? f(o.value) : x`                                 | `Option.match(o, { onNone: () => x, onSome: f })`                             |
| `Option.isSome(o) ? f(o.value) : undefined`                         | `Option.getOrUndefined(Option.map(o, f))`                                     |
| `Option.getOrUndefined(o) ?? x`                                     | `Option.getOrElse(o, () => x)`                                                |
| `Option.isSome(o) && p(o.value)`                                    | `Option.exists(o, p)`                                                         |
| `Option.isSome(o) ? Option.some(yield* f(o.value)) : Option.none()` | `yield* Effect.transposeOption(Option.map(o, f))`                             |
| `Option.isSome(o) ? o.value : yield* fallback`                      | `yield* Option.match(o, { onSome: Effect.succeed, onNone: () => fallback })` |

Call `Option.getOrUndefined` only where the value leaves for a plain `?: T` parameter, as
the generator calls in `packages/cli/src/commands/generate/**/*.handler.ts` do. Optional
flags that need parsing go through one effectful match, from
`packages/cli/src/commands/generate/generate.parse.ts`:

```ts no-check
const parseOptional =
  (parse: (input: string) => Effect.Effect<number, CliError>) =>
  (input: Option.Option<string>): Effect.Effect<number | undefined, CliError> =>
    Option.match(input, { onNone: () => Effect.succeed(undefined), onSome: parse })
```

## Time in tests: drive `TestClock`

`it.effect` from `@effect/vitest` runs on a `TestClock` parked at epoch. An Effect sleep
inside the code under test only completes when the test moves that clock, so awaiting it
on the test fiber hangs. Fork, adjust until the fiber settles, then join:

```ts
import { it } from '@effect/vitest'
import { Effect, Fiber, Schedule } from 'effect'
import { TestClock } from 'effect/testing'

class Unreachable extends Error {
  readonly _tag = 'Unreachable'
}

const lookup: Effect.Effect<never, Unreachable> = Effect.fail(new Unreachable('fetch failed')).pipe(
  Effect.retry(Schedule.max([Schedule.exponential('500 millis'), Schedule.recurs(2)])),
)

it.effect('passes the failure through once the retries are spent', () =>
  Effect.gen(function* () {
    const fiber = yield* lookup.pipe(Effect.flip, Effect.forkChild)
    for (let step = 0; step < 100 && fiber.pollUnsafe() === undefined; step++) {
      yield* Effect.yieldNow
      yield* TestClock.adjust('1 minute')
    }
    const error = yield* Fiber.join(fiber)
    if (!(error instanceof Unreachable)) throw new Error('expected the failure to pass through')
  }),
)
```

Pick an `adjust` window larger than the whole schedule. Use `it.live` only for code that
waits outside Effect's clock, and shorten that wait in the test.

## v3 → v4 rename table (historical — recognize stale patterns, don't copy them)

If you see the left column in code or in your memory of Effect, it is v3 (or a 4.0 beta)
and needs translation. Verify anything not listed against `repos/effect/migration/*.md`
and `repos/effect/packages/effect/src`.

| v3 or 4.0 beta                                                       | 4.1                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Context.Tag`, `Context.GenericTag`, `Effect.Service`                | `Context.Service` + an explicit static `layer`                                                   |
| `@effect/cli`, `@effect/platform`; 4.0 beta `effect/unstable/cli`    | `effect/cli`; `FileSystem`, `Path`, `Terminal` from `effect`                                     |
| 4.0 beta `Schema.TaggedErrorClass`                                   | `Schema.TaggedError`                                                                             |
| 4.0 beta `Config.string`, `Flag.string`, `Argument.string`           | `Config.String`, `Flag.String`, `Argument.String` (constructors are capitalized)                 |
| 4.0 beta `Flag.boolean`, `Flag.integer`, `Flag.choice`               | `Flag.Boolean`, `Flag.Int`, `Flag.Literals`                                                      |
| 4.0 beta `Flag.choiceWithValue`                                      | `Flag.ChoiceWithValue`                                                                           |
| `Effect.catchAll` / `catchAllCause` / `catchAllDefect` / `catchSome` | `Effect.catch` / `catchCause` / `catchDefect` / `catchFilter`                                    |
| `Either`                                                             | `Result`                                                                                         |
| `ParseResult.ParseError`                                             | `Schema.SchemaError` + `SchemaIssue`                                                             |
| `Schema.Literal(a, b)`, `Schema.Union(A, B)` (variadic)              | `Schema.Literals([a, b])`, `Schema.Union([A, B])`                                                |
| `Schema.parseJson(schema)`                                           | `Schema.fromJsonString(schema)`                                                                  |
| `FiberRef`, `Effect.locally`                                         | `Context.Reference` + `Effect.provideService`                                                    |
| `Effect.async`, `Layer.scoped`                                       | `Effect.callback`, `Layer.effect`                                                                |
| `Effect.fork`                                                        | `Effect.forkChild`                                                                               |
| `it.scoped` (`@effect/vitest`)                                       | removed — `it.effect` already scopes                                                             |
