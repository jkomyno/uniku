# Schema v4: Transformations, Validation Depth, and Decode Errors

How to transform data while decoding in Effect v4: encode/decode symmetry, branded types, custom messages, effectful checks, and decode failure handling (`SchemaIssue` model, formatters, recovery, all-vs-first collection). Full migration map: `repos/effect/migration/schema.md`.

## Transforming during decode: `decodeTo` + `SchemaTransformation`

A v4 transformation is `from.pipe(Schema.decodeTo(to, transformation))`. The transformation is a pair of `SchemaGetter`s (or a prebuilt `SchemaTransformation`): `decode` maps `From["Type"] -> To["Encoded"]`, `encode` maps back. Bare `Schema.decodeTo(to)` composes two schemas (the v3 `Schema.compose`).

```ts
import { Schema, SchemaTransformation } from 'effect'

const DateFromUnixSeconds = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.Date,
    SchemaTransformation.transform({
      decode: (seconds) => new Date(seconds * 1000),
      encode: (date) => Math.floor(date.getTime() / 1000),
    }),
  ),
)

const date = Schema.decodeUnknownSync(DateFromUnixSeconds)(1700000000)
const seconds = Schema.encodeSync(DateFromUnixSeconds)(date)

// Bare decodeTo composes schemas (v3 Schema.compose):
// trim the input string, then parse it as a number
const NumberFromPaddedString = Schema.Trim.pipe(Schema.decodeTo(Schema.NumberFromString))
```

- **v3 → v4**: `Schema.transform(from, to, { strict, decode, encode })` is gone. Use `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({ decode, encode })))`.
- Getters skip missing values (`Option.None`) — `transform` functions only run on present values. Use `SchemaGetter.transformOptional` to handle absence.
- Never `throw` inside `transform` — use `transformOrFail` (below) for fallible conversions.
- Built-ins cover common cases: `Schema.NumberFromString`, `Schema.FiniteFromString`, `Schema.DateFromString`, `Schema.BigIntFromString`, `Schema.URLFromString`, `Schema.Trim`, `Schema.fromJsonString(schema)`, `Schema.UnknownFromJsonString` (v3 `parseJson`).

## Fallible transformations: `SchemaGetter.transformOrFail` + `SchemaIssue`

When a conversion can fail, the getter returns an `Effect` that fails with a `SchemaIssue.Issue` (not an `Error`, not a thrown exception).

```ts
import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from 'effect'

const Port = Schema.String.pipe(
  Schema.decodeTo(Schema.Int, {
    decode: SchemaGetter.transformOrFail((s: string) => {
      const n = Number(s)
      return Number.isInteger(n) && n > 0 && n < 65536
        ? Effect.succeed(n)
        : Effect.fail(new SchemaIssue.InvalidValue(Option.some(s), { message: `invalid port: ${s}` }))
    }),
    encode: SchemaGetter.String(),
  }),
)
```

- **v3 → v4**: `ParseResult` is gone. `ParseResult.fail(new ParseResult.Type(ast, input, msg))` becomes `Effect.fail(new SchemaIssue.InvalidValue(Option.some(input), { message }))`.
- `SchemaTransformation.transformOrFail({ decode, encode })` builds both getters at once when both sides are fallible.
- `SchemaGetter` also ships ready-made getters: `String()`, `Number()`, `Boolean()`, `Date()`, `trim()`, `toLowerCase()`, `parseJson()`, `split()`, base64/hex codecs.

## Normalization during decode (trim, lowercase, canonical forms)

For same-type cleanup, use `Schema.decode({ decode, encode })` — it keeps `Type`/`Encoded` identical while applying getters on the way in/out. Checks appended after the transformation validate the normalized value.

```ts
import { Schema, SchemaGetter, SchemaTransformation } from 'effect'

const Email = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.transform((s: string) => s.trim().toLowerCase()),
    encode: SchemaGetter.passthrough(),
  }),
)
  .check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { expected: 'an email address' }))
  .pipe(Schema.brand('Email'))

type Email = typeof Email.Type

// Reusable string transformations live in SchemaTransformation:
const Lowered = Schema.String.pipe(Schema.decodeTo(Schema.String, SchemaTransformation.toLowerCase()))
```

- **v3 → v4**: `Schema.Lowercase`, `Schema.Capitalize`, `Schema.NonEmptyTrimmedString` are gone. Compose them: `SchemaTransformation.trim()/toLowerCase()/toUpperCase()/capitalize()/snakeToCamel()`, `Schema.Trimmed.check(Schema.isNonEmpty())`.
- `Schema.Trim` normalizes (decode trims); `Schema.Trimmed` only validates (rejects untrimmed input). Pick deliberately.
- Normalization belongs in `decode`; `encode` is usually `SchemaGetter.passthrough()` since the decoded value is already canonical.

## Branded types

`Schema.brand` adds a nominal brand to the decoded type. It adds **no runtime checks** — attach those with `.check(...)` first.

```ts
import { Schema } from 'effect'

const UserId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^user_[a-z0-9]{12}$/, { expected: 'a user id (user_ + 12 chars)' })),
  Schema.brand('UserId'),
)
type UserId = typeof UserId.Type // string & Brand<"UserId">

const OrderId = Schema.String.pipe(Schema.brand('OrderId'))
type OrderId = typeof OrderId.Type

declare const loadUser: (id: UserId) => void

const id = Schema.decodeUnknownSync(UserId)('user_abcdef123456')
loadUser(id)
// loadUser("user_abcdef123456")        — type error: plain string is not UserId
// loadUser(... as unknown as OrderId)  — type error: brands don't mix
```

- **v3 → v4**: filter combinators are renamed with an `is` prefix and attach via `.check(...)`, not `.pipe(...)`: `pattern` → `check(isPattern(re))`, `minLength` → `isMinLength`, `int` → `isInt`, `between` → `isBetween`, `greaterThan` → `isGreaterThan`. `Schema.UUID` → `Schema.String.check(Schema.isUUID())`.
- `Schema.fromBrand(identifier, ctor)` applies an existing `Brand.Constructor`'s checks plus its brand.

## Bidirectional API/DB ↔ domain mapping

Define the domain struct once with per-field transformations, then rename encoded keys with `Schema.encodeKeys({ decodedKey: encodedKey })`. One schema handles both directions.

```ts
import { Effect, Schema } from 'effect'

const User = Schema.Struct({
  userId: Schema.String,
  createdAt: Schema.DateFromString, // encoded: ISO string, decoded: Date
  isActive: Schema.Boolean,
}).pipe(Schema.encodeKeys({ userId: 'user_id', createdAt: 'created_at', isActive: 'is_active' }))

type User = typeof User.Type // { userId: string; createdAt: Date; isActive: boolean }
type UserRow = typeof User.Encoded // { user_id: string; created_at: string; is_active: boolean }

const fromRow = Schema.decodeUnknownEffect(User)
const toRow = Schema.encodeEffect(User)

const roundTrip = Effect.gen(function* () {
  const user = yield* fromRow({
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
  })
  return yield* toRow(user)
})
```

- **v3 → v4**: `Schema.rename({ a: "b" })` and the double-`Schema.transform` struct-mapping idiom are gone — `encodeKeys` replaces both for key renames.
- Keep the _domain_ shape as the struct's field names; `Encoded` is derived. Don't define two structs and map by hand.
- For derived/computed decoded-only fields use `Schema.extendTo(fields, derive)` (stripped on encode).

## Custom messages and annotations

`annotate` (v3 `annotations`) sets node-level annotations; filters take an annotations argument directly. Messages are plain strings in v4 (no message functions).

```ts
import { Schema } from 'effect'

const Username = Schema.String.annotate({
  identifier: 'Username', // names type-level failures: "Expected Username, got 123"
  message: 'Username must be a string', // full replacement for type-failure messages
}).check(
  Schema.isMinLength(3, { message: 'Username must be at least 3 characters' }),
  Schema.isPattern(/^[a-z0-9_]+$/, { expected: 'lowercase letters, digits, or underscores' }),
)

const Form = Schema.Struct({
  username: Username.pipe(Schema.annotateKey({ messageMissingKey: 'username is required' })),
})
```

- On a filter: `message` replaces the whole failure message; `expected` keeps the `Expected <expected>, got <actual>` shape. `identifier` does NOT name failed filters — only type-level failures.
- Missing-key messages go on the _field_ via `Schema.annotateKey({ messageMissingKey })`; unexpected-key messages via `messageUnexpectedKey` on the struct's `annotate`.
- **v3 → v4**: `schema.annotations({...})` → `schema.annotate({...})`; the v3 `message: (issue) => ...` function form is gone.

## Decode failures: `SchemaError`, `SchemaIssue`, and formatting

All `decode*`/`encode*` runners fail with `Schema.SchemaError` (tag `"SchemaError"`), which carries a structured `issue: SchemaIssue.Issue` tree. Format issues with `SchemaIssue` formatters — for humans use `makeFormatterDefault()` (multi-line string, same as `error.message`); for logs/API payloads use `makeFormatterStandardSchemaV1()` (`{ issues: [{ path, message }] }`).

```ts
import { Effect, Schema, SchemaIssue } from 'effect'

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Int,
})

const handled = Schema.decodeUnknownEffect(Person)({ age: 'x' }, { errors: 'all' }).pipe(
  Effect.catchTag('SchemaError', (error) => {
    const pretty = SchemaIssue.makeFormatterDefault()(error.issue)
    const structured = SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues
    return Effect.logError(pretty, structured).pipe(Effect.as(undefined))
  }),
)
```

Runner cheat sheet (per schema, options second): `decodeUnknownEffect` (→ `Effect<Type, SchemaError, DecodingServices>`), `decodeUnknownExit`, `decodeUnknownResult` (→ `Result`), `decodeUnknownOption`, `decodeUnknownPromise`, `decodeUnknownSync` (throws `SchemaError`). Same family for `encode*`; full matrix in [schema-basics.md](schema-basics.md).

- **v3 → v4**: `decodeUnknown` → `decodeUnknownEffect`; `decodeUnknownEither` → `decodeUnknownResult`/`decodeUnknownExit` (`Either` is gone, the module is `Result`); `validate*` are removed (use `Schema.decodeSync(Schema.toType(schema))` etc.); `ParseResult.ArrayFormatter.formatError(e)` → `SchemaIssue.makeFormatterStandardSchemaV1()(e.issue).issues`; `TreeFormatter` → `SchemaIssue.makeFormatterDefault()`.
- The top-level `Formatter` module (`Formatter.format`) is general value pretty-printing — issue formatting lives in `SchemaIssue`, not `Formatter`.
- Customize rendering with hooks: `SchemaIssue.makeFormatterStandardSchemaV1({ leafHook, checkHook })`.
- `Schema.isSchemaError(u)` narrows unknown caught values; `SchemaError` is catchable with `Effect.catchTag("SchemaError", ...)`.

## Collecting all issues vs first issue + cross-field checks

Parsing stops at the first issue by default. Pass `{ errors: "all" }` (a `ParseOptions` field) to collect everything. Cross-field rules and multi-issue reporting use `Schema.makeFilter` on the struct, returning a `FilterOutput`.

```ts
import { Schema } from 'effect'

const SignUp = Schema.Struct({
  username: Schema.String.check(Schema.isMinLength(3)),
  password: Schema.String.check(Schema.isMinLength(8)),
  confirmPassword: Schema.String,
}).check(
  Schema.makeFilter((o) =>
    o.password === o.confirmPassword ? undefined : { path: ['confirmPassword'], issue: 'passwords must match' },
  ),
)

// Report every field error at once (form UX), instead of one at a time
const decodeAll = Schema.decodeUnknownEffect(SignUp, { errors: 'all' })
```

- `makeFilter` predicates may return: `undefined`/`true` (ok), `false` (generic failure), `string` (message), a `SchemaIssue.Issue`, `{ path, issue }`, or an array of those (multiple failures at once; empty array = ok).
- Other `ParseOptions`: `onExcessProperty: "ignore" | "error" | "preserve"`, `disableChecks`, `concurrency` (for async checks, default `1`).
- **v3 → v4**: don't hand-roll error accumulation with `Effect.either` loops — `errors: "all"` plus the issue tree already aggregates per-path failures.

## Recovery: fallbacks and decoding defaults

`Schema.catchDecoding` recovers from any decode failure with a fallback (v3 `decodingFallback` annotation). `withDecodingDefault*` supplies defaults for absent/`undefined` fields.

```ts
import { Effect, Schema } from 'effect'

// Fallback value when decoding fails entirely
const LenientNumber = Schema.NumberFromString.pipe(Schema.catchDecoding(() => Effect.succeedSome(0)))

const Settings = Schema.Struct({
  // default when key is absent OR undefined; value is in decoded (Type) form
  theme: Schema.String.pipe(Schema.withDecodingDefaultType(Effect.succeed('light'))),
  // default in Encoded form (runs through the field's transformation)
  retries: Schema.NumberFromString.pipe(Schema.withDecodingDefault(Effect.succeed('3'))),
})
```

- `catchDecoding` handlers return `Effect<Option<Type>, Issue>` — `Effect.succeedSome(value)` recovers, re-failing maps the issue. Succeeding with `Option.none()` means "no value": it omits the key when the schema is a struct field, but a top-level decode still fails (`InvalidValue`). `catchDecodingWithContext` allows service requirements; `catchEncoding` mirrors for the encode direction.
- The `*Key` variants (`withDecodingDefaultKey`, `withDecodingDefaultTypeKey`) only fire when the key is absent (an explicit `undefined` still fails) — the v3 `optionalWith(s, { exact: true, default })`.
- Retry/backoff/timeouts are not schema concerns: decode once, then apply `Effect.retry`/`Effect.timeout` to the surrounding effect.

## Effectful / async validation inside schemas

v3 `Schema.filterEffect` is gone. Use `Schema.decode` with `SchemaGetter.checkEffect`: the check returns an Effect of `undefined | boolean | string | FilterIssue` and may require services, which surface in the schema's `DecodingServices`.

```ts
import { Context, Effect, Layer, Schema, SchemaGetter } from 'effect'

class UserDirectory extends Context.Service<
  UserDirectory,
  {
    isTaken(username: string): Effect.Effect<boolean>
  }
>()('app/UserDirectory') {}

const AvailableUsername = Schema.String.check(Schema.isMinLength(3)).pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect((username: string) =>
      Effect.gen(function* () {
        const directory = yield* UserDirectory
        const taken = yield* directory.isTaken(username)
        return taken ? `username "${username}" is already taken` : undefined
      }),
    ),
    encode: SchemaGetter.passthrough(),
  }),
)

// The service requirement is tracked: Effect<string, SchemaError, UserDirectory>
const decodeUsername = Schema.decodeUnknownEffect(AvailableUsername)

const DirectoryStub = Layer.succeed(UserDirectory, UserDirectory.of({ isTaken: (u) => Effect.succeed(u === 'admin') }))

const checked = decodeUsername('new_user').pipe(Effect.provide(DirectoryStub))
```

Promise-based clients (external APIs, db drivers) are wrapped with `Effect.tryPromise` and recovered _inside_ the check so its error channel stays `never`:

```ts
import { Effect, Schema, SchemaGetter } from 'effect'

declare const verifyCardWithGateway: (cardNumber: string) => Promise<boolean>

const ValidCard = Schema.String.check(Schema.isPattern(/^\d{16}$/)).pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect((card: string) =>
      Effect.tryPromise({
        try: () => verifyCardWithGateway(card),
        catch: () => 'gateway-error' as const,
      }).pipe(
        Effect.map((ok) => (ok ? undefined : 'card was rejected by the payment gateway')),
        Effect.catch(() => Effect.succeed('card verification is unavailable, try again')),
      ),
    ),
    encode: SchemaGetter.passthrough(),
  }),
)
```

- Async/service-backed schemas CANNOT run through `decodeUnknownSync` — it fails with a `Forbidden` issue. Use `decodeUnknownEffect` (or `decodeUnknownPromise`).
- Multiple async checks run sequentially by default; raise `{ concurrency: n | "unbounded" }` in parse options.
- For high-volume dedup/batching of external checks, validate shape with Schema and do the batched lookups outside the schema (e.g. `RequestResolver`) — don't hide caching layers inside getters.
- `SchemaGetter.transformOrFail` also accepts effectful, service-requiring functions when the async step must _transform_ (not just validate).

## Domain errors at the schema boundary

Convert `SchemaError` into your own tagged error where decoding meets your domain. Define errors with `Schema.TaggedErrorClass` (NOT v3 `Data.TaggedError` with constructor overrides).

```ts
import { Effect, Schema } from 'effect'

class InvalidPayload extends Schema.TaggedErrorClass<InvalidPayload>()('InvalidPayload', {
  detail: Schema.String,
}) {}

const Payload = Schema.Struct({ id: Schema.String, amount: Schema.Finite })

const parsePayload = Effect.fn('parsePayload')(function* (input: unknown) {
  return yield* Schema.decodeUnknownEffect(Payload)(input, { errors: 'all' }).pipe(
    Effect.mapError((error) => new InvalidPayload({ detail: error.message })),
  )
})

const recovered = parsePayload({}).pipe(
  Effect.catchTag('InvalidPayload', (e) => Effect.logWarning(e.detail).pipe(Effect.as(null))),
)
```

- Keep two representations: `error.message` / `makeFormatterDefault()` for logs and developers, `makeFormatterStandardSchemaV1()(error.issue).issues` for structured API responses keyed by `path`.
- `SchemaError.issue` may contain raw input values; issue formatters honor `Redacted` values, but don't embed secrets in custom messages.
- **v3 → v4**: `Schema.TaggedError` → `Schema.TaggedErrorClass`; fields are schema-typed, constructed with a single props object.

## Deep dives

- `repos/effect/migration/schema.md` — full v3 → v4 Schema API map (optionals, `optionalWith` decision tree, `extend`, `pick/omit` via `mapFields`).
- `repos/effect/packages/effect/src/SchemaGetter.ts` / `SchemaTransformation.ts` — every built-in getter/transformation.
- `repos/effect/packages/effect/src/SchemaIssue.ts` — issue tree variants and formatter hooks.
