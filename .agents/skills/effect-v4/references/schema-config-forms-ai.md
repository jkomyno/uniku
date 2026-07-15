# Schema in Practice: Config, Forms, and AI Structured Output

Applied Schema v4 recipes for three boundaries: loading app configuration (Config + ConfigProvider + Redacted), validating user-submitted forms (all-issues collection, per-field error maps, cross-field rules), and exchanging structured data with LLMs (deriving JSON Schema, parsing model replies with recovery).

## Environment & Config

Config fundamentals — value constructors, `Config.all`/`Config.nested`, swapping `ConfigProvider`s, `ConfigError` — live in [platform.md](platform.md). This section covers the applied recipes: `Config.schema`, config inside layers, feature flags, and secrets.

### Typed app config from env vars

`Config.schema(codec, path?)` turns any `Schema.Codec` into a `Config<T>`. Configs are yieldable inside `Effect.gen` and resolve the current `ConfigProvider` from context (default: `ConfigProvider.fromEnv()`).

```ts
import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect'

const AppConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    port: Config.Port, // Schema.Int restricted to 1-65535
    debug: Config.Boolean, // accepts "true"/"yes"/"on"/"1"/...
    logLevel: Config.LogLevel,
  }),
  'app',
)

// camelCase schema keys + env vars: constantCase maps "app.host" -> APP_HOST
const EnvLayer = ConfigProvider.layer(ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase))

const program = Effect.gen(function* () {
  const config = yield* AppConfig // Config<T> is yieldable, fails with ConfigError
  yield* Effect.log(`listening on ${config.host}:${config.port}`)
}).pipe(Effect.provide(EnvLayer))
```

- v3 → v4: `Config` and `ConfigProvider` are core `"effect"` modules. The primary v4 API is `Config.schema` — the full Schema toolkit (checks, transformations, unions) now works for config. Shortcuts survive: `Config.string/number/boolean/int/port/url/date/duration/logLevel/redacted(name?)`.
- v3 `Effect.config(cfg)` is gone — just `yield*` the config, or call `cfg.parse(provider)` for an explicit provider.
- `Config.withDefault(x)` / `Config.option` only kick in for **missing data**; validation errors (wrong type, out of range) still fail. Use `Config.orElse` to swallow everything. Beware `Schema.fromJsonString` values: keys missing _inside_ the JSON document also count as missing data, so a present-but-malformed value silently falls back — see "Trap: `withDefault` swallows malformed JSON config values" in [platform.md](platform.md).
- Source precedence (defaults → file → env) is a provider concern, not a manual deep-merge: compose with `ConfigProvider.orElse(primary, fallback)` or install fallbacks via `ConfigProvider.layerAdd`. Provider sources (`fromEnv`, `fromDotEnv`, `fromUnknown`, `fromDir`) and their layering are covered in [platform.md](platform.md).
- `Config.nested("db")` scopes keys under a prefix; with `fromEnv` that means `DB_`-prefixed vars.

### Layering config into services

Read config inside `Layer.effect` so validation happens once at startup, and the rest of the app depends on the typed service, not on env vars.

```ts
import { Config, Context, Effect, Layer, Redacted, Schema } from 'effect'

class ApiClient extends Context.Service<
  ApiClient,
  {
    get(path: string): Effect.Effect<string>
  }
>()('myapp/ApiClient') {
  static readonly layer = Layer.effect(
    ApiClient,
    Effect.gen(function* () {
      const config = yield* Config.schema(
        Schema.Struct({
          baseUrl: Schema.URL,
          apiKey: Schema.Redacted(Schema.String), // never appears in logs
        }),
        'api',
      )
      const get = Effect.fn('ApiClient.get')(function* (path: string) {
        const url = new URL(path, config.baseUrl)
        const authHeader = `Bearer ${Redacted.value(config.apiKey)}`
        yield* Effect.log(`GET ${url}`) // authHeader is unwrapped only here
        return url.toString()
      })
      return ApiClient.of({ get })
    }),
  )
}
```

- The layer's error channel carries `ConfigError` — a bad deployment fails at startup, not mid-request.
- To _choose_ an implementation from config (in-memory vs remote, etc.), wrap the decision in `Layer.unwrap(Effect.gen(function* () { ... return someLayer }))`.
- v3 → v4: `Context.Tag` is gone; services are `class X extends Context.Service<X, {...}>()("id")` with explicit layers returning `X.of({...})`.

### Feature flags with safe defaults

`Context.Reference` is a service with a built-in default — readable anywhere with zero layers, overridable per-environment or per-test.

```ts
import { Config, Context, Effect, Layer } from 'effect'

interface FeatureFlags {
  readonly newDashboard: boolean
  readonly betaApi: boolean
}

const FeatureFlags = Context.Reference<FeatureFlags>('myapp/FeatureFlags', {
  defaultValue: () => ({ newDashboard: false, betaApi: false }),
})

const render = Effect.gen(function* () {
  const flags = yield* FeatureFlags // falls back to defaults if nothing provided
  yield* Effect.log(flags.newDashboard ? 'new dashboard' : 'old dashboard')
})

// Optional env override; each flag degrades safely when its var is unset
const FlagsFromEnv = Layer.effect(
  FeatureFlags,
  Effect.gen(function* () {
    return {
      newDashboard: yield* Config.boolean('FF_NEW_DASHBOARD').pipe(Config.withDefault(false)),
      betaApi: yield* Config.boolean('FF_BETA_API').pipe(Config.withDefault(false)),
    }
  }),
)

const program = render.pipe(Effect.provide(FlagsFromEnv))
```

- v3 → v4: `FiberRef` is gone — `Context.Reference` is the replacement for ambient values with defaults. For a single test or request, override with `Effect.provideService(FeatureFlags, { ... })` instead of a layer.
- Rollout-percentage / user-segment logic is plain domain code on top of this; keep it in a service, not in the schema.

### Secrets with Redacted

`Redacted<T>` hides values from logs, `toString`, errors, and inspection. Decode secrets into `Redacted` at the boundary and unwrap with `Redacted.value` only where the raw value is consumed.

```ts
import { Config, Effect, Redacted, Schema } from 'effect'

const program = Effect.gen(function* () {
  const apiKey = yield* Config.redacted('API_KEY') // Config<Redacted<string>>

  yield* Effect.log('config loaded', apiKey) // prints <redacted>

  // Unwrap only at the call site that needs the raw value
  return `Bearer ${Redacted.value(apiKey)}`
})

// In larger config structs, mark secret fields with Schema.Redacted
const DbConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    password: Schema.Redacted(Schema.String),
  }),
  'db',
)
```

- v3 → v4 naming trap: v4 `Schema.Redacted(S)` decodes a value that is **already** `Redacted` (v3's `RedactedFromSelf`); inside `Config.schema` the provider codec wraps raw strings for you. To decode a _raw_ value (e.g. a JSON field) into `Redacted`, use `Schema.RedactedFromValue(S)` (that was v3's `Schema.Redacted`).
- If the inner schema fails, the issue itself is redacted — neither the value nor schema details leak into error messages.
- Do not hand-roll regex-based log scrubbers; `Redacted` is the native mechanism and works through `Effect.log`, error causes, and `Inspectable` output.
- `Schema.Redacted(S, { disallowJsonEncode: true })` makes JSON serialization of the secret an error.

## Form-Style Validation

### Validating user input structs

One schema is the single source of truth for the parsed type, the constraints, and the error messages.

```ts
import { Effect, Schema } from 'effect'

const SignUpForm = Schema.Struct({
  username: Schema.String.check(
    Schema.isMinLength(3),
    Schema.isMaxLength(20),
    Schema.isPattern(/^[a-zA-Z0-9_-]+$/, { message: 'Only letters, digits, _ and -' }),
  ),
  email: Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid email address' })),
  age: Schema.Int.check(Schema.isBetween({ minimum: 13, maximum: 120 })),
  password: Schema.String.check(Schema.isMinLength(8, { message: 'At least 8 characters' })),
})

type SignUpForm = typeof SignUpForm.Type

const decodeSignUp = Schema.decodeUnknownEffect(SignUpForm)

const submit = Effect.fn('submit')(function* (input: unknown) {
  const form = yield* decodeSignUp(input) // fails with Schema.SchemaError
  yield* Effect.log(`welcome ${form.username}`)
  return form
})
```

- v3 → v4 renames (the #1 source of broken Schema code): filters gained an `is` prefix and attach via `.check(...)`, not `.pipe(...)` — `minLength` → `isMinLength`, `pattern(re)` → `check(isPattern(re))`, `between` → `isBetween({ minimum, maximum })`, `int()` → `isInt()` (or just `Schema.Int`), `nonEmptyString` → `isNonEmpty()`. `positive`/`nonNegative` were removed — use `isGreaterThan(0)` / `isGreaterThanOrEqualTo(0)`.
- Decode renames: `decodeUnknown` → `decodeUnknownEffect`, `decodeUnknownEither` → `decodeUnknownExit` (or `decodeUnknownResult`; Either is gone, the v4 module is `Result`). `decodeUnknownSync` throws and is for scripts/tests, not request handlers. Full entrypoint matrix: [schema-basics.md](schema-basics.md).
- Per-check messages go in the second argument: `isMinLength(8, { message: "..." })`. Use `expected: "..."` instead to keep the default `Expected <expected>, got <actual>` shape.
- v3 `Schema.Trimmed`/`trimmed()` → `Schema.Trim` (codec that trims while decoding) or `Schema.Trimmed` (validates already-trimmed input).

### Collecting all issues and mapping them to fields

By default decoding stops at the first issue. Pass `{ errors: "all" }`, then flatten `SchemaError.issue` into `{ path, message }` pairs for the UI.

```ts
import { Effect, Schema, SchemaIssue } from 'effect'

const Profile = Schema.Struct({
  name: Schema.NonEmptyString,
  email: Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  age: Schema.Int.check(Schema.isBetween({ minimum: 18, maximum: 120 })),
})

const decodeAll = Schema.decodeUnknownEffect(Profile, { errors: 'all' })
const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

const validate = (input: unknown) =>
  decodeAll(input).pipe(
    Effect.map((profile) => ({ ok: true as const, profile })),
    Effect.catchTag('SchemaError', (error) => {
      const byField: Record<string, Array<string>> = {}
      for (const issue of formatIssues(error.issue).issues) {
        const key = (issue.path ?? [])
          .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
          .join('.')
        ;(byField[key] ??= []).push(issue.message)
      }
      return Effect.succeed({ ok: false as const, byField })
    }),
  )
// validate({}) succeeds with
// { ok: false, byField: { name: ["Missing key"], email: [...], age: [...] } }
```

- v3 → v4: `ParseResult.ArrayFormatter.formatError` is gone. Decoding fails with `Schema.SchemaError` carrying a nested `SchemaIssue.Issue` in `.issue`; format it with `SchemaIssue.makeFormatterStandardSchemaV1()` (structured `{ path, message }`) or `SchemaIssue.makeFormatterDefault()` (human-readable string).
- Customize leaf messages globally via the formatter's `leafHook` / `checkHook` options (e.g. translate `"MissingKey"` to "Required").
- `SchemaError` is `_tag`-ged, so `Effect.catchTag("SchemaError", ...)` works like any tagged error.

### Cross-field (dependent) rules

Struct-level rules are `.check(Schema.makeFilter(...))` on the whole struct. A filter can target a nested path or report several failures at once.

```ts
import { Schema } from 'effect'

const PasswordChange = Schema.Struct({
  newPassword: Schema.String.check(Schema.isMinLength(8)),
  confirmPassword: Schema.String,
}).check(
  Schema.makeFilter((form) =>
    form.newPassword === form.confirmPassword
      ? undefined // success
      : { path: ['confirmPassword'], issue: 'Passwords do not match' },
  ),
)

// Conditional requirements, several failures reported together
const ShippingAddress = Schema.Struct({
  country: Schema.String,
  state: Schema.optionalKey(Schema.String),
  zipCode: Schema.optionalKey(Schema.String),
}).check(
  Schema.makeFilter((address) => {
    const issues: Array<Schema.FilterIssue> = []
    if (address.country === 'US') {
      if (address.state === undefined) {
        issues.push({ path: ['state'], issue: 'State is required for US addresses' })
      }
      if (address.zipCode === undefined) {
        issues.push({ path: ['zipCode'], issue: 'Zip code is required for US addresses' })
      }
    }
    return issues // empty array = success
  }),
)
```

- v3 → v4: `Schema.filter(predicate, { message })` → `.check(Schema.makeFilter(predicate))`. The predicate may return `undefined`/`true` (pass), `false`, a `string` message, `{ path, issue }`, or an array of `Schema.FilterIssue`.
- Returning a `path` makes the error land on the right form field instead of the form root — combine with the per-field mapping above.
- v3 `Schema.optionalWith(...)` is gone: `optionalKey(S)` = key may be absent; `optional(S)` = absent or `undefined`. Defaults use `Schema.withDecodingDefaultType(Effect.succeed(x))` (see `repos/effect/migration/schema.md`).

### Nested forms

Compose small schemas; issue paths point into the nesting, so the same per-field error mapping works for arbitrarily deep forms.

```ts
import { Schema } from 'effect'

const Address = Schema.Struct({
  street: Schema.NonEmptyString,
  city: Schema.NonEmptyString,
  zipCode: Schema.String.check(Schema.isPattern(/^\d{5}(-\d{4})?$/)),
})

const LineItem = Schema.Struct({
  productId: Schema.String,
  quantity: Schema.Int.check(Schema.isGreaterThan(0)),
  price: Schema.Finite.check(Schema.isGreaterThan(0)),
})

const Order = Schema.Struct({
  customer: Schema.Struct({
    name: Schema.NonEmptyString,
    shippingAddress: Address,
  }),
  // length checks work on arrays too (minItems/maxItems in JSON Schema)
  items: Schema.Array(LineItem).check(Schema.isMinLength(1)),
})

const decodeOrder = Schema.decodeUnknownEffect(Order, { errors: 'all' })
// Issue paths point into the structure:
//   ["customer", "shippingAddress", "zipCode"], ["items", 0, "quantity"], ...
```

- v3 `minItems/maxItems` → `isMinLength`/`isMaxLength` (they work on both strings and arrays).
- Whole-form invariants (e.g. order total must equal the item sum) go in a struct-level `makeFilter`, decoded in the same pass.

### Async checks (e.g. username availability)

Effectful validation is part of the schema in v4: pipe through `Schema.decode` with `SchemaGetter.checkEffect`. Format checks run first, so the effect only sees structurally valid input.

```ts
import { Effect, Schema, SchemaGetter } from 'effect'

declare const isUsernameAvailable: (username: string) => Effect.Effect<boolean>

const Username = Schema.String.check(Schema.isMinLength(3), Schema.isPattern(/^[a-zA-Z0-9_-]+$/)).pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect((username: string) =>
      isUsernameAvailable(username).pipe(Effect.map((available) => available || `Username "${username}" is taken`)),
    ),
    encode: SchemaGetter.passthrough(),
  }),
)

const decodeUsername = Schema.decodeUnknownEffect(Username)
// Effect<string, SchemaError> — the async check is just part of decoding
```

- v3 → v4: `Schema.filterEffect` is gone; this `Schema.decode` + `SchemaGetter.checkEffect` pair is the replacement. The check effect succeeds with `undefined`/`true` (pass), `false` or a `string` message (fail), or a full `Schema.FilterIssue` (e.g. `{ path, issue }`) — same shapes as `makeFilter`.
- Schemas with effectful checks cannot be decoded with `decodeUnknownSync` — use the `Effect` (or `Promise`) variants.
- Run independent async checks in parallel _outside_ the schema with `Effect.all([...], { concurrency: "unbounded" })` when latency matters; debounce/timeout belong to the caller (`Effect.timeout`), not the schema.

## Schemas for AI Structured Output

### Deriving JSON Schema from a schema

`Schema.toJsonSchemaDocument` produces a draft 2020-12 document: `{ dialect, schema, definitions }`.

```ts
import { JsonSchema, Schema } from 'effect'

const SentimentAnalysis = Schema.Struct({
  sentiment: Schema.Literals(['positive', 'negative', 'neutral']),
  confidence: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  keywords: Schema.Array(Schema.String),
}).annotate({ description: 'Sentiment analysis of the input text' })

const doc = Schema.toJsonSchemaDocument(SentimentAnalysis)

// Most LLM APIs want a single self-contained object:
const jsonSchema = {
  ...doc.schema,
  ...(Object.keys(doc.definitions).length > 0 ? { $defs: doc.definitions } : {}),
}

// Need draft-07 for older tooling?
const draft07 = JsonSchema.toDocumentDraft07(doc)
```

- v3 → v4: `JSONSchema.make(schema)` is **gone**. Use `Schema.toJsonSchemaDocument(schema, options?)`; the result is a document, not a bare schema object — merge `definitions` into `$defs` yourself if the consumer wants one object.
- `additionalProperties` defaults to `false` — exactly what strict structured-output modes want. Override per call via `toJsonSchemaDocument(s, { additionalProperties: true })`.
- `{ generateDescriptions: true }` synthesizes descriptions for checks (e.g. "a value with a length of at least 3") when you haven't written any.
- The `effect/unstable/ai` provider adapters call this internally — you only need it when talking to a model API by hand.

### Designing LLM-friendly schemas

Descriptions become JSON Schema `description` entries that the model reads as instructions. Constrain everything you can: literals over free strings, tagged unions over optional-field soups, shallow nesting over deep trees.

```ts
import { Schema } from 'effect'

const Task = Schema.Struct({
  title: Schema.String.annotate({ description: 'Short imperative summary, max 80 chars' }),
  priority: Schema.Literals(['critical', 'high', 'medium', 'low']).annotate({
    description: 'critical = fix now, high = this sprint, medium = next sprint, low = backlog',
  }),
  estimatedHours: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 40 })).annotate({
    description: 'Whole hours, 1-40',
  }),
})

// Discriminated union: a literal tag tells the model exactly which shape to emit
const ExtractionResult = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('invoice'),
    total: Schema.Finite,
    currency: Schema.Literals(['USD', 'EUR', 'GBP']),
  }),
  Schema.Struct({
    kind: Schema.Literal('receipt'),
    merchant: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal('unknown'),
    reason: Schema.String.annotate({ description: 'Why the document could not be classified' }),
  }),
])
```

- v3 → v4: `annotations({...})` → `annotate({...})`; `Schema.Literal("a", "b")` → `Schema.Literals(["a", "b"])`; `Schema.Union(A, B)` → `Schema.Union([A, B])` (variadic → array everywhere).
- Always include a fallback union member (like `"unknown"` above) so the model has a legal escape hatch instead of hallucinating into another member.
- Recursive shapes use `Schema.suspend(() => Self)`, but cap depth in the prompt — models degrade quickly past 2–3 levels of nesting.
- Keep enums as lowercase literal strings; descriptions, not field names, carry semantics like value meanings or item counts.

### Parsing model responses with recovery and retry

Model replies arrive as text. `Schema.fromJsonString(schema)` decodes string → JSON → validated type in a single step, failing with `SchemaError` on malformed JSON _or_ schema mismatch.

```ts
import { Effect, Predicate, Schedule, Schema } from 'effect'

class ModelError extends Schema.TaggedErrorClass<ModelError>()('ModelError', {
  message: Schema.String,
}) {}

// Stub for your model call: returns the raw text completion
declare const callModel: (prompt: string) => Effect.Effect<string, ModelError>

const Analysis = Schema.Struct({
  sentiment: Schema.Literals(['positive', 'negative', 'neutral']),
  confidence: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
})

const decodeAnalysis = Schema.decodeUnknownEffect(Schema.fromJsonString(Analysis))

const analyze = Effect.fn('analyze')(function* (text: string) {
  const raw = yield* callModel(`Return JSON sentiment analysis for: ${text}`)
  return yield* decodeAnalysis(raw)
})

// Strategy 1: fresh attempt on decode failures only, capped retries
const analyzeWithRetry = (text: string) =>
  analyze(text).pipe(
    Effect.retry({
      schedule: Schedule.exponential('200 millis'),
      times: 2,
      while: Predicate.isTagged('SchemaError'),
    }),
  )

// Strategy 2: repair loop — feed the validation error back to the model
const analyzeWithRepair = Effect.fn('analyzeWithRepair')(function* (text: string) {
  const prompt = `Return JSON sentiment analysis for: ${text}`
  const raw = yield* callModel(prompt)
  return yield* decodeAnalysis(raw).pipe(
    Effect.catchTag('SchemaError', (schemaError) =>
      callModel(
        `${prompt}\nYour previous reply failed validation:\n${schemaError.message}\nReply with corrected JSON only.`,
      ).pipe(Effect.flatMap(decodeAnalysis)),
    ),
  )
})
```

- v3 → v4: `Schema.parseJson(schema)` → `Schema.fromJsonString(schema)`; bare `Schema.parseJson()` → `Schema.UnknownFromJsonString`.
- Retry the _whole_ call-plus-decode pipeline — re-decoding the same bad string can never succeed. Gate with `while` so non-retryable errors (auth, quota) fail fast.
- For a defaults-based fallback, catch `SchemaError` and `Effect.succeed` a safe value, or build tolerance into the schema with `Schema.catchDecoding(() => Effect.succeedSome(fallback))` per field.
- There is no partial/incomplete-JSON parser in Schema v4. Don't hand-repair truncated braces; raise `max_tokens`, or stream and validate once the response is complete.

### Structured output via effect/unstable/ai

If you use Effect's AI modules, `LanguageModel.generateObject` derives the JSON Schema, sends it to the provider, and decodes the reply through your schema — the whole previous section in one call.

```ts
import { Effect, Schema } from 'effect'
import { LanguageModel } from 'effect/unstable/ai'

const LaunchPlan = Schema.Struct({
  audience: Schema.String,
  channels: Schema.Array(Schema.String),
  summary: Schema.String,
})

const extractPlan = Effect.fn('extractPlan')(function* (notes: string) {
  const response = yield* LanguageModel.generateObject({
    objectName: 'launch_plan',
    prompt: `Convert these notes into a launch plan:\n${notes}`,
    schema: LaunchPlan,
  })
  return response.value // typed as typeof LaunchPlan.Type
})
// Requires a provider layer (e.g. from @effect/ai-openai / @effect/ai-anthropic)
// supplied where the effect is run.
```

- Streaming (`LanguageModel.streamText`) emits response parts; validate structured payloads when complete — incremental schema validation of partial JSON is not a v4 feature.
- v3 → v4: the `@effect/ai` package moved into core as `effect/unstable/ai`.

### Standard Schema v1 interop

`Schema.toStandardSchemaV1(schema)` attaches a spec-compliant `~standard.validate` to the schema, so one schema serves third-party form libraries and AI SDKs that accept "standard schemas". (Raw schemas do not carry `validate` — convert first.)

```ts
import { Schema } from 'effect'

const Person = Schema.Struct({
  name: Schema.NonEmptyString,
  age: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 150 })),
})

const standard = Schema.toStandardSchemaV1(Person)

const result = standard['~standard'].validate({ name: 'Ada', age: 36 })
// { value: ... } on success, { issues: [{ path, message }, ...] } on failure
// (a Promise instead, if the schema performs async work)
```

- v3 → v4: `Schema.standardSchemaV1` → `Schema.toStandardSchemaV1`. It defaults to `errors: "all"` and accepts `leafHook`/`checkHook` for message customization.
- Schemas with effectful checks or async transformations make `validate` return a `Promise` — consumers that require sync validation will break on those schemas.
