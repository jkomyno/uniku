# Schema v4: JSON, Document, and HTTP Response Validation

How to validate external data with Effect v4 Schema: JSON strings, config files, evolving/partial documents, database JSON columns at adapter boundaries, and HTTP API responses (plain `fetch` and the v4 `HttpClient` from `effect/unstable/http`), plus web-standard formats (UUID, URL, dates, email, MIME).

## Decode entrypoints and SchemaError

All v3 `decode*`/`validate*` names changed. Decoding fails with `Schema.SchemaError` (tag `"SchemaError"`, detailed `issue` field) — there is no `ParseError` in v4. The full entrypoint matrix (all `Sync`/`Effect`/`Result`/`Exit`/`Option`/`Promise` flavors) is in [schema-basics.md](schema-basics.md); the highest-traffic renames:

| v3                              | v4                                                              |
| ------------------------------- | --------------------------------------------------------------- |
| `Schema.decodeUnknown(S)`       | `Schema.decodeUnknownEffect(S)`                                 |
| `Schema.decode(S)`              | `Schema.decodeEffect(S)`                                        |
| `Schema.decodeUnknownEither(S)` | `Schema.decodeUnknownExit(S)` (or `decodeUnknownResult(S)`)     |
| `Schema.encode(S)`              | `Schema.encodeEffect(S)`                                        |
| `Schema.validate*`              | removed — `decode*` + `Schema.toType(S)`                        |
| `ParseResult.ArrayFormatter`    | `SchemaIssue.makeFormatterStandardSchemaV1()(err.issue).issues` |

```ts
import { Effect, Schema } from 'effect'

const User = Schema.Struct({
  id: Schema.Int,
  name: Schema.NonEmptyString,
})

// unknown -> Effect<{ id: number; name: string }, Schema.SchemaError>
const decodeUser = Schema.decodeUnknownEffect(User)

const program = decodeUser({ id: 1, name: 'Ada' }).pipe(
  Effect.catchTag('SchemaError', (error) =>
    Effect.logError('decode failed', error.issue).pipe(Effect.as({ id: 0, name: 'unknown' })),
  ),
)
```

- Catch decode failures with `Effect.catchTag("SchemaError", ...)`, not `"ParseError"`.
- `Schema.Int`, `Schema.NonEmptyString`, `Schema.Finite` are built-ins; v3 `Schema.Number.pipe(Schema.int())` is gone — constraints are checks now (next sections).
- Sync variants exist (`decodeUnknownSync`) but throw; prefer the Effect variants in Effect code.

## Parsing JSON strings: Schema.fromJsonString

One schema does parse + validate: the `Encoded` side is a JSON string, the `Type` side is your domain value. Encoding produces the JSON string back — ideal round-trip for queue payloads or text columns.

**v3 → v4**: `Schema.parseJson(schema)` → `Schema.fromJsonString(schema)`; bare `Schema.parseJson()` → `Schema.UnknownFromJsonString`.

```ts
import { Effect, Schema } from 'effect'

const JobPayload = Schema.Struct({
  jobId: Schema.String,
  attempts: Schema.Int,
  runAt: Schema.DateTimeUtcFromString,
})

const JobPayloadFromJson = Schema.fromJsonString(JobPayload)

const program = Effect.gen(function* () {
  const payload = yield* Schema.decodeEffect(JobPayloadFromJson)(
    `{"jobId":"j-1","attempts":2,"runAt":"2026-06-10T12:00:00Z"}`,
  )
  // payload.runAt is a DateTime.Utc, not a string
  const stored = yield* Schema.encodeEffect(JobPayloadFromJson)(payload)
  return stored // JSON string, ready to persist
})
```

- Invalid JSON text and shape mismatches both surface as `SchemaError` — one failure channel for the whole boundary.
- Never `JSON.parse` inside `Effect.sync` (throws become defects); use `fromJsonString`, or `Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)` for "typed `JSON.parse`" (`string -> unknown`).

## Config files: defaults and range checks

Read with the core `FileSystem` service (v4: in `"effect"`, not `@effect/platform`), decode through `fromJsonString`, and express defaults in the schema so the decoded config has no optional holes.

**v3 → v4**: `Schema.optionalWith(S, { default })` is gone → `S.pipe(Schema.withDecodingDefaultType*(Effect.succeed(...)))`. `Schema.int()`/`Schema.between(a, b)` → `.check(Schema.isInt())` / `.check(Schema.isBetween({ minimum, maximum }))`. `Schema.Literal("a", "b")` → `Schema.Literals(["a", "b"])`. `Schema.positive()` is removed (use `isGreaterThan(0)`).

```ts
import { Effect, FileSystem, Schema } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

const AppConfig = Schema.Struct({
  appName: Schema.NonEmptyString,
  port: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 })),
  environment: Schema.Literals(['development', 'staging', 'production']),
  // missing key -> "info" (default given in Encoded terms)
  logLevel: Schema.Literals(['error', 'warn', 'info', 'debug']).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed('info' as const)),
  ),
  // missing key -> 5000 (default given in Type terms)
  timeoutMillis: Schema.Int.pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed(5000))),
})

const ConfigFromJson = Schema.fromJsonString(AppConfig)

const loadConfig = Effect.fn('loadConfig')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  const content = yield* fs.readFileString(path)
  return yield* Schema.decodeEffect(ConfigFromJson)(content)
})

const main = loadConfig('./config.json').pipe(Effect.provide(NodeFileSystem.layer))
```

- `withDecodingDefault*Key` variants allow only an absent key; the non-`Key` variants also accept `undefined`. The `Type` variants take the default as a decoded value, the others as an encoded value.
- Checks compose: `Schema.Int.check(Schema.isBetween({...}), Schema.isMultipleOf(2))`. For environment variables prefer the core `Config` module instead.

## Partial documents (PATCH-style)

**v3 → v4**: `Schema.partial(S)` is gone. Map the fields: `optionalKey` = key may be absent (exact), `optional` = absent or `undefined`.

```ts
import { Effect, Schema, Struct } from 'effect'

const Product = Schema.Struct({
  id: Schema.String,
  name: Schema.NonEmptyString,
  price: Schema.Finite.check(Schema.isGreaterThan(0)),
  stock: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 10_000 })),
})

// every key optional; present fields still validated
const ProductPatch = Product.mapFields(Struct.map(Schema.optionalKey))
type ProductPatch = typeof ProductPatch.Type

class EmptyPatchError extends Schema.TaggedErrorClass<EmptyPatchError>()('EmptyPatchError', {
  message: Schema.String,
}) {}

const decodePatch = Schema.decodeUnknownEffect(ProductPatch)

const applyPatch = Effect.fn('applyPatch')(function* (current: typeof Product.Type, raw: unknown) {
  const patch = yield* decodePatch(raw)
  if (Object.keys(patch).length === 0) {
    return yield* new EmptyPatchError({ message: 'patch must contain at least one field' })
  }
  return { ...current, ...patch }
})
```

- Subset-partial: `Product.mapFields(Struct.mapPick(["name", "price"], Schema.optionalKey))`.
- `pick`/`omit` also moved to `mapFields`: `Product.mapFields(Struct.pick(["id", "name"]))`.
- Re-validate the merged document against the full schema if checks span multiple fields.

## Schema evolution: versioned unions normalized to the current shape

Encode migrations inside the schema: each historical version is a struct that `decodeTo`s the current shape, then union them. Decoding any stored version always yields the current type.

```ts
import { Effect, Schema, SchemaTransformation } from 'effect'

const SettingsV1 = Schema.Struct({
  version: Schema.Literal(1),
  name: Schema.String,
})

const SettingsV2 = Schema.Struct({
  version: Schema.Literal(2),
  fullName: Schema.String,
  maxRetries: Schema.Int,
})

// V1 documents decode into the current (V2) shape
const SettingsV1ToV2 = SettingsV1.pipe(
  Schema.decodeTo(
    SettingsV2,
    SchemaTransformation.transform({
      decode: (v1) => ({ version: 2 as const, fullName: v1.name, maxRetries: 3 }),
      encode: (v2) => ({ version: 1 as const, name: v2.fullName }),
    }),
  ),
)

// accepts any historical version, always produces the current shape
const Settings = Schema.Union([SettingsV2, SettingsV1ToV2])

// optional last resort: a fallback document when decoding fails entirely
const SettingsWithFallback = Settings.pipe(
  Schema.catchDecoding(() => Effect.succeedSome({ version: 2 as const, fullName: 'default', maxRetries: 3 })),
)

const decodeSettings = Schema.decodeUnknownEffect(SettingsWithFallback)
```

- **v3 → v4**: `Schema.Union(A, B)` (variadic) → `Schema.Union([A, B])` (array). `Schema.transform(from, to, { decode, encode })` → `from.pipe(Schema.decodeTo(to, SchemaTransformation.transform({ decode, encode })))`. The `decodingFallback` annotation → `Schema.catchDecoding(() => Effect.succeedSome(...))`.
- Union members are tried in order; list the current version first.
- `catchDecoding` masks all decode failures — reserve it for genuinely optional documents, and log via `catchDecodingWithContext` if you need services.

## JSON columns at the storage adapter boundary

Keep row shapes inside the adapter: decode raw driver rows (`unknown`) into domain values with one row schema, and never export row types to domain modules. Works for any SQL/KV driver — the driver client stays behind a port.

```ts
import { Effect, Schema } from 'effect'

class StoreError extends Schema.TaggedErrorClass<StoreError>()('StoreError', {
  cause: Schema.Defect(),
}) {}

// domain document stored in the JSON column
const JobState = Schema.Struct({
  status: Schema.Literals(['pending', 'running', 'done']),
  attempts: Schema.Int,
  lastError: Schema.optionalKey(Schema.String),
})

// row as the driver returns it
const JobRow = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  // jsonb-style column: driver already parsed it, arrives as unknown JSON
  state: JobState,
  // text column holding JSON: decode the string through the same schema
  snapshot: Schema.fromJsonString(JobState),
})

// the actual driver call lives behind the adapter; stubbed here
declare const queryRowById: (id: string) => Effect.Effect<unknown, StoreError>

const decodeRow = Schema.decodeUnknownEffect(JobRow)

const findJob = Effect.fn('JobStore.findJob')(function* (id: string) {
  const raw = yield* queryRowById(id)
  return yield* decodeRow(raw)
})
```

- Symmetric write path: `Schema.encodeUnknownEffect(JobRow)` before INSERT/UPDATE — encoding re-runs checks, catching bad writes before they hit storage.
- For a column that is intentionally free-form JSON, use `Schema.Json` (any JSON value) instead of `Schema.Unknown` so encoding stays JSON-safe.
- Decode immediately after SELECT; downstream code sees only `typeof JobRow.Type`, never raw rows or driver types.

## HTTP: plain fetch + Schema decode

For one-off calls without the HttpClient layer: `Effect.tryPromise({ try, catch })` for each fallible step, then decode. Never `Effect.promise(() => fetch(...))` — rejections would become defects instead of typed errors.

```ts
import { Effect, Schema } from 'effect'

class ApiError extends Schema.TaggedErrorClass<ApiError>()('ApiError', {
  reason: Schema.Literals(['network', 'status', 'body']),
  detail: Schema.String,
}) {}

const User = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  email: Schema.String,
})

const decodeUser = Schema.decodeUnknownEffect(User)

const fetchUser = Effect.fn('fetchUser')(function* (id: number) {
  const response = yield* Effect.tryPromise({
    try: (signal) => fetch(`https://api.example.com/users/${id}`, { signal }),
    catch: (cause) => new ApiError({ reason: 'network', detail: String(cause) }),
  })
  if (!response.ok) {
    return yield* new ApiError({ reason: 'status', detail: `HTTP ${response.status}` })
  }
  const body = yield* Effect.tryPromise({
    try: () => response.json() as Promise<unknown>,
    catch: (cause) => new ApiError({ reason: 'body', detail: String(cause) }),
  })
  return yield* decodeUser(body)
})
```

- `Effect.tryPromise` passes an `AbortSignal` — wire it into `fetch` so interruption cancels the request.
- Type `response.json()` as `Promise<unknown>`; the DOM type is `any`, which silently defeats decoding.
- Error channel is `ApiError | Schema.SchemaError` — handle them separately (`catchTag` accepts a single tag or an array of tags in v4).

## HTTP: the v4 HttpClient with schema-aware response helpers

For real services prefer `HttpClient` from `effect/unstable/http`: base-URL/headers middleware, typed status filtering, transient retry, and schema decoding of bodies via `HttpClientResponse.schemaBodyJson`.

**v3 → v4**: all `@effect/platform/Http*` modules moved to `effect/unstable/http`. `FetchHttpClient.layer` provides the implementation (or `NodeHttpClient` from `@effect/platform-node`).

```ts
import { Effect, flow, Schedule, Schema } from 'effect'
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/unstable/http'

const Todo = Schema.Struct({
  id: Schema.Int,
  title: Schema.String,
  completed: Schema.Boolean,
})

const program = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(flow(HttpClientRequest.prependUrl('https://api.example.com'), HttpClientRequest.acceptJson)),
    HttpClient.filterStatusOk, // non-2xx -> typed HttpClientError
    HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 3 }),
  )

  // GET + decode the JSON body with a schema
  const todos = yield* client.get('/todos').pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(Todo))))

  // POST a JSON body, decode the created entity
  const created = yield* HttpClientRequest.post('/todos').pipe(
    HttpClientRequest.bodyJsonUnsafe({ title: 'write docs', completed: false }),
    client.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
  )

  return { todos, created }
}).pipe(Effect.provide(FetchHttpClient.layer))
```

- Helper names: `schemaBodyJson` (JSON body), `schemaJson` (status + headers + body), `schemaNoBody`, `schemaHeaders`, `schemaBodyUrlParams` — all on `HttpClientResponse`.
- `retryTransient` retries timeouts, transport errors, and transient statuses (408/429/500/502/503/504); decode (`SchemaError`) failures are never retried — they happen after the client pipeline.
- Wrap client errors at the service boundary: `Effect.mapError((cause) => new MyServiceError({ cause }))`, with `cause: Schema.Defect()` in the error class.
- In production services build this client once inside a `Context.Service` layer (see repos/effect-smol/ai-docs/src/50_http-client/10_basics.ts).

## Retry and timeout around validated calls

Retry transport failures, never contract failures: a `SchemaError` is deterministic, so retrying it just burns time.

```ts
import { Effect, Schedule, Schema } from 'effect'

class UpstreamError extends Schema.TaggedErrorClass<UpstreamError>()('UpstreamError', {
  status: Schema.Int,
}) {}

declare const fetchAndDecode: (id: string) => Effect.Effect<{ readonly id: string }, UpstreamError | Schema.SchemaError>

const resilient = (id: string) =>
  fetchAndDecode(id).pipe(
    Effect.timeout('3 seconds'), // adds Cause.TimeoutError to the error channel
    Effect.retry({
      while: (error) => error._tag !== 'SchemaError',
      schedule: Schedule.exponential(200),
      times: 3,
    }),
  )
```

- v4 `Effect.retry` takes `{ while, until, times, schedule }` or a bare `Schedule`; `Schedule.exponential(200)` takes `Duration.Input` (number = millis, or `"200 millis"`).
- `Effect.timeout` fails with `Cause.TimeoutError` (tag `"TimeoutError"`) — it participates in `while` above and is retried.
- Order matters: `timeout` inside `retry` re-times each attempt; swapped, the timeout caps the whole retry loop.

## Discriminated success/error envelopes

Decode the whole envelope as a union, then branch on the discriminator and convert API-level failures into typed errors.

```ts
import { Effect, Schema } from 'effect'

const Success = Schema.Struct({
  status: Schema.Literal('success'),
  data: Schema.Struct({ id: Schema.String, name: Schema.String }),
})

const Failure = Schema.Struct({
  status: Schema.Literal('error'),
  code: Schema.Int,
  message: Schema.String,
})

const Pending = Schema.Struct({
  status: Schema.Literal('pending'),
  jobId: Schema.String,
})

const Envelope = Schema.Union([Success, Failure, Pending])

class UpstreamError extends Schema.TaggedErrorClass<UpstreamError>()('UpstreamError', {
  code: Schema.Int,
  message: Schema.String,
}) {}

class StillPending extends Schema.TaggedErrorClass<StillPending>()('StillPending', {
  jobId: Schema.String,
}) {}

const decodeEnvelope = Schema.decodeUnknownEffect(Envelope)

const handle = Effect.fn('handle')(function* (raw: unknown) {
  const res = yield* decodeEnvelope(raw)
  switch (res.status) {
    case 'success':
      return res.data
    case 'error':
      return yield* new UpstreamError({ code: res.code, message: res.message })
    case 'pending':
      return yield* new StillPending({ jobId: res.jobId })
  }
})
```

- **v3 → v4**: `Schema.Union(A, B, C)` → `Schema.Union([A, B, C])`; `Schema.Literal("a", "b")` → `Schema.Literals(["a", "b"])` (single-value `Schema.Literal("a")` still exists).
- The `switch` is exhaustive over the literal discriminator — adding a union member is a compile error here, which is the point.
- To stamp a discriminator that is absent from the wire format, use `mapFields((f) => ({ ...f, kind: Schema.tagDefaultOmit("circle") }))` (v3 `attachPropertySignature`).

## Web-standard formats: UUID, URL, dates, email, MIME

v4 ships fewer named string schemas; most formats are checks on `Schema.String`. Built-ins that exist: `Schema.URL` / `Schema.URLFromString`, `Schema.Date` / `Schema.DateFromString` / `Schema.DateValid`, `Schema.DateTimeUtc` / `Schema.DateTimeUtcFromString` / `Schema.DateTimeUtcFromMillis`, `Schema.DateTimeZoned*`, checks `isUUID`, `isULID`, `isPattern`, `isBase64`-style string checks.

**v3 → v4**: `Schema.UUID` → `Schema.String.check(Schema.isUUID())`; `Schema.pattern(re)` → `.check(Schema.isPattern(re))`; `Schema.URLFromSelf` → `Schema.URL`; `Schema.DateFromSelf` → `Schema.Date`; there is no built-in email schema in either version.

```ts
import { Schema } from 'effect'

// UUID / ULID as branded identifiers
const JobId = Schema.String.check(Schema.isUUID(4)).pipe(Schema.brand('JobId'))
const TraceId = Schema.String.check(Schema.isULID())

// URL: Schema.URL validates URL instances; URLFromString decodes strings
const Endpoint = Schema.URLFromString

// dates: prefer DateTime.Utc for transport boundaries
const CreatedAt = Schema.DateTimeUtcFromString // ISO-8601 string <-> DateTime.Utc
const LegacyDate = Schema.DateFromString.check(Schema.isDateValid()) // string <-> valid js Date

// email: pattern check + brand
const Email = Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)).pipe(Schema.brand('Email'))
type Email = typeof Email.Type

// MIME types: allowlist via Literals, general shape via template literal
const KnownMime = Schema.Literals(['application/json', 'text/plain', 'image/png'])
const MimeShape = Schema.TemplateLiteral([Schema.String, '/', Schema.String])

// header values via template literals
const BearerToken = Schema.TemplateLiteral(['Bearer ', Schema.String])
```

- `Schema.TemplateLiteral` takes an array of parts (v3 was variadic); `Schema.TemplateLiteralParser(schema.parts)` additionally parses the parts into a tuple.
- `Schema.brand("X")` survives from v3 and composes after checks; branded types prevent mixing validated and raw strings.
- `DateFromString` alone accepts strings that parse to `Invalid Date` — always add `.check(Schema.isDateValid())` (or use `DateTimeUtcFromString`, which rejects invalid input).
- Length/number checks were renamed with an `is` prefix: `isMinLength`, `isMaxLength`, `isLengthBetween`, `isInt`, `isBetween({ minimum, maximum })`, `isGreaterThan` — and `positive`/`nonNegative` are gone.
