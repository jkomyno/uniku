# Schema v4 Basics

Fundamentals for Effect v4 Schema: defining schemas, decoding/encoding, constraints (checks), optional fields, arrays/tuples, unions, composition, recursion, and class-based schemas. Full migration map: `repos/effect/migration/schema.md`.

## Mental model: Type, Encoded, services

A schema is a bidirectional codec. `S["Type"]` is the decoded type, `S["Encoded"]` the wire type, and `S["DecodingServices"]`/`S["EncodingServices"]` track Effect services needed by transformations. Extract types with `typeof X.Type` / `typeof X.Encoded`.

```ts
import { Schema } from 'effect'

const Product = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  inStock: Schema.Boolean,
})

type Product = typeof Product.Type
// { readonly id: string; readonly name: string; readonly price: number; readonly inStock: boolean }

// Equivalent type-level helpers
type ProductT = Schema.Schema.Type<typeof Product>
type ProductE = Schema.Codec.Encoded<typeof Product>
```

- Generic constraints: use `Schema.Schema<T>` ("any schema decoding to T"), `Schema.Codec<T, E, RD, RE>` (full codec), or `Schema.Top` (any schema, for generic helpers).
- v3 → v4: the v3 `Schema.Schema<A, I, R>` triple is gone. v4 splits the context into decoding/encoding services; reach for `Schema.Codec<T, E>` where you wrote `Schema.Schema<A, I>`.
- v3 → v4: `Schema.Schema.Encoded<S>` → `Schema.Codec.Encoded<S>`; `typeSchema`/`encodedSchema` → `Schema.toType`/`Schema.toEncoded`.

## Primitives, literals, enums, records

`Schema.Literal` takes exactly one literal; multiple literals use `Schema.Literals([...])` (array, not variadic).

```ts
import { Schema } from 'effect'

const Status = Schema.Literals(['active', 'inactive', 'pending'])
type Status = typeof Status.Type // "active" | "inactive" | "pending"

const Active = Schema.Literal('active')
const SuccessCode = Schema.Literals([200, 201, 204])
const Subset = Status.pick(['active', 'inactive'])

enum Role {
  Admin = 'admin',
  User = 'user',
}
const RoleSchema = Schema.Enum(Role)

const Counters = Schema.Record(Schema.String, Schema.Number)
```

- Primitives: `Schema.String`, `Schema.Number`, `Schema.Boolean`, `Schema.BigInt`, `Schema.Symbol`, `Schema.Null`, `Schema.Undefined`, `Schema.Unknown`, `Schema.Any`, `Schema.Never`, `Schema.Void`.
- v3 → v4: `Schema.Literal("a", "b")` → `Schema.Literals(["a", "b"])`; `Schema.Literal(null)` → `Schema.Null`; `pickLiteral("a")` → `Literals([...]).pick(["a"])`.
- v3 → v4: `Schema.Record({ key, value })` → `Schema.Record(key, value)` (two positional args).
- v3 → v4: `*FromSelf` names dropped the suffix: `DateFromSelf` → `Schema.Date`, `URLFromSelf` → `Schema.URL`, `OptionFromSelf` → `Schema.Option`. The v3 transforming `Schema.Date` (string → Date) is now `Schema.DateFromString` — note it does **not** reject invalid dates; add `.check(Schema.isDateValid())` (the prebuilt `Schema.DateValid` is `Schema.Date` plus that check).

## Decoding and encoding

Every direction has `unknown`-input and typed-input variants, each in six flavors: `Sync` (throws `SchemaError`), `Effect` (fails with `SchemaError`), `Result`, `Exit`, `Option`, `Promise`. Encoding mirrors decoding (`encodeSync`, `encodeUnknownEffect`, ...).

```ts
import { Effect, Result, Schema } from 'effect'

const User = Schema.Struct({ name: Schema.String, age: Schema.Number })

// Sync: returns the value or throws SchemaError
const user = Schema.decodeUnknownSync(User)({ name: 'Alice', age: 30 })

// Result: no exceptions, no Effect runtime needed
const result = Schema.decodeUnknownResult(User)({ name: 'Bob', age: 41 })
if (Result.isSuccess(result)) {
  console.log(result.success.name)
}

// Effect: composable, preserves decoding services in R
const program = Effect.gen(function* () {
  const decoded = yield* Schema.decodeUnknownEffect(User)({ name: 'Carol', age: 7 })
  return decoded.age
})

// Encoding is the mirror image
const wire = Schema.encodeSync(User)(user)
```

- v3 → v4: `decodeUnknown` → `decodeUnknownEffect`; `decode` → `decodeEffect`. Plain `Schema.decode`/`Schema.encode` now mean something else entirely (attaching transformations) — never use them to parse values.
- v3 → v4: `decodeUnknownEither` is gone (Either is gone). Use `decodeUnknownResult` (Result) or `decodeUnknownExit` (Exit).
- v3 → v4: `validate`, `validateSync`, `validateEither`, `validateOption` are removed. Use `Schema.decodeUnknownSync(Schema.toType(schema))` etc. to check the `Type` side only.
- `Schema.is(schema)` is a type guard; `Schema.asserts(schema, input)` asserts directly (v3 returned an assertion function: `asserts(schema)(input)`).
- The `Sync`/`Result`/`Exit`/`Option`/`Promise` variants only accept schemas with no decoding services; service-requiring schemas must go through `decodeUnknownEffect`.

### Handling decode failures

Failures carry a structured `SchemaIssue.Issue` inside `SchemaError` (field `.issue`). `ParseResult` does not exist in v4.

```ts
import { Effect, Schema, SchemaIssue } from 'effect'

const User = Schema.Struct({ name: Schema.String, age: Schema.Number })

class ValidationError extends Schema.TaggedErrorClass<ValidationError>()('ValidationError', {
  messages: Schema.Array(Schema.String),
}) {}

const parseUser = Effect.fn('parseUser')(
  function* (input: unknown) {
    return yield* Schema.decodeUnknownEffect(User)(input)
  },
  Effect.catch((error) => {
    // error: SchemaError — error.issue is the structured issue tree
    const issues = SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues
    return Effect.fail(new ValidationError({ messages: issues.map((i) => i.message) }))
  }),
)

// At a sync boundary, narrow thrown errors with the guard
try {
  Schema.decodeUnknownSync(User)({})
} catch (error) {
  if (Schema.isSchemaError(error)) {
    console.error(error.message) // pretty-printed issue tree
  }
}
```

- v3 → v4: `ParseResult.ArrayFormatter.formatError(e)` → `SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues`; `ParseResult.TreeFormatter` → `error.message` already renders the tree.
- `SchemaError` has `_tag: "SchemaError"`, so `Effect.catchTag("SchemaError", ...)` also works.

## Constraints: the checks system

v3's `Schema.filter` + named filters (`minLength`, `between`, `positive`...) are replaced by **checks**: `schema.check(...filters)` (or pipeable `Schema.check(...)`) with filters renamed to an `is*` prefix.

```ts
import { Schema } from 'effect'

const Username = Schema.String.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(20),
  Schema.isPattern(/^[a-z0-9_]+$/, { message: 'lowercase letters, digits and _ only' }),
)

const Age = Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 150 }))

const Price = Schema.Number.check(Schema.isGreaterThan(0))

// Custom predicate: makeFilter (return true/undefined = ok, string = error message)
const EvenNumber = Schema.Number.check(Schema.makeFilter((n: number) => n % 2 === 0 || 'must be even'))

// Cross-field validation with a path-targeted issue
const Signup = Schema.Struct({
  password: Schema.String,
  confirmPassword: Schema.String,
}).check(
  Schema.makeFilter((o) =>
    o.password === o.confirmPassword ? undefined : { path: ['confirmPassword'], issue: 'passwords must match' },
  ),
)
```

- Common filters: `isMinLength`/`isMaxLength`/`isLengthBetween` (strings AND arrays), `isNonEmpty`, `isPattern`, `isTrimmed`, `isUUID()`, `isULID()`, `isStartsWith`/`isEndsWith`/`isIncludes`, `isInt`, `isFinite`, `isGreaterThan(OrEqualTo)`, `isLessThan(OrEqualTo)`, `isMultipleOf`. Note `isBetween` takes an options object `{ minimum, maximum }`.
- Prebuilt schemas: `Schema.NonEmptyString`, `Schema.Int`, `Schema.Finite`, `Schema.Trimmed`, `Schema.NumberFromString`, `Schema.FiniteFromString`, `Schema.DateFromString`, `Schema.DateValid`, `Schema.URLFromString`, `Schema.UnknownFromJsonString`, `Schema.fromJsonString(schema)`.
- Custom messages: every filter takes optional annotations — `{ message: "plain string" }`. v3 → v4: the message annotation is a **string**, not a `() => string` thunk.
- Type-narrowing refinements use `Schema.refine(guard)` instead of `check` (e.g. `Schema.Option(Schema.String).pipe(Schema.refine(Option.isSome))`).
- v3 → v4: `Schema.filter(pred)` → `schema.check(Schema.makeFilter(pred))`; `pattern(regex)` → `check(isPattern(regex))`; `nonEmptyString` → `check(isNonEmpty())`.
- v3 → v4: `Schema.Positive`, `Schema.NonNegative`, `positive()`, `negative()` are **removed**. Use `check(Schema.isGreaterThan(0))` / `check(Schema.isGreaterThanOrEqualTo(0))`.
- v3 → v4: `Schema.UUID` → `Schema.String.check(Schema.isUUID())`.

## Optional fields, nullability, defaults

v4 distinguishes "key may be absent" (`optionalKey`) from "key absent or value `undefined`" (`optional`). Defaults are applied with `withDecodingDefault*` combinators, not options bags.

```ts
import { Effect, Schema } from 'effect'

const Profile = Schema.Struct({
  id: Schema.String,
  // key may be missing; undefined is NOT accepted
  bio: Schema.optionalKey(Schema.String),
  // key may be missing OR explicitly undefined
  nickname: Schema.optional(Schema.String),
  // key required, value may be null
  deletedAt: Schema.NullOr(Schema.String),
  // missing/undefined -> decoded default (default given as the decoded Type)
  theme: Schema.String.pipe(Schema.withDecodingDefaultType(Effect.succeed('light'))),
})

type Profile = typeof Profile.Type
// {
//   readonly id: string
//   readonly bio?: string
//   readonly nickname?: string | undefined
//   readonly deletedAt: string | null
//   readonly theme: string
// }

const decoded = Schema.decodeUnknownSync(Profile)({ id: 'u1', deletedAt: null })
console.log(decoded.theme) // "light"
```

- Helpers: `Schema.NullOr`, `Schema.UndefinedOr`, `Schema.NullishOr` (null | undefined).
- Defaults family: `withDecodingDefaultType` (key absent or undefined, default is a `Type` value), `withDecodingDefaultTypeKey` (key absent only), `withDecodingDefault`/`withDecodingDefaultKey` (default given as the `Encoded` value). `withConstructorDefault` applies only to `Struct.make`, not decoding.
- v3 → v4: `Schema.optionalWith(s, { exact: true })` → `Schema.optionalKey(s)`; `optionalWith(s, { default: () => x })` → `s.pipe(Schema.withDecodingDefaultType(Effect.succeed(x)))`. The nullable variants need `NullOr` + `decodeTo` (see `repos/effect/migration/schema.md` § optionalWith).
- v3 → v4: `Schema.partial`/`Schema.required(schema)` are gone as standalone combinators — see Composition below.
- Making optional fields required again: `Schema.requiredKey` / `Schema.required` via `mapFields`.

## Arrays and tuples

`Schema.Tuple` takes an **array** of element schemas. Length constraints reuse `isMinLength`/`isMaxLength` — there is no `minItems`/`maxItems`.

```ts
import { Schema } from 'effect'

const Tags = Schema.Array(Schema.String) // ReadonlyArray<string>
const Authors = Schema.NonEmptyArray(Schema.String) // readonly [string, ...string[]]

const LimitedTags = Schema.Array(Schema.String).check(Schema.isMinLength(1), Schema.isMaxLength(10))

const UniqueIds = Schema.UniqueArray(Schema.String)

const Point = Schema.Tuple([Schema.Number, Schema.Number])
type Point = typeof Point.Type // readonly [number, number]

// Fixed head + variadic rest: readonly [string, ...number[]]
const ListWithHeader = Schema.TupleWithRest(Schema.Tuple([Schema.String]), [Schema.Number])
```

- v3 → v4: `Schema.Tuple(A, B)` → `Schema.Tuple([A, B])`; `minItems(n)`/`maxItems(n)`/`itemsCount(n)` → `check(isMinLength(n))`/`check(isMaxLength(n))`/`check(isLengthBetween(n, n))`.
- v3 → v4: `NonEmptyArrayEnsure` removed; `Schema.ArrayEnsure` (coerce single value to array) still exists.

## Unions and discriminated unions

`Schema.Union` takes an **array** of members. For tagged unions, `Schema.TaggedStruct` adds a `_tag` literal field, and `Schema.TaggedUnion` builds the whole union plus `match`/`guards` utilities in one shot — prefer it for new code.

```ts
import { Schema } from 'effect'

// Plain union (array form!)
const NumberOrString = Schema.Union([Schema.Number, Schema.String])

// Tagged members; decoded values narrow on _tag as usual
const PaymentResult = Schema.Union([
  Schema.TaggedStruct('Success', { transactionId: Schema.String, amount: Schema.Number }),
  Schema.TaggedStruct('Failure', { reason: Schema.String, retryable: Schema.Boolean }),
])
type PaymentResult = typeof PaymentResult.Type

const describe = (r: PaymentResult): string => {
  switch (r._tag) {
    case 'Success':
      return `paid ${r.amount} (${r.transactionId})`
    case 'Failure':
      return `failed: ${r.reason}`
  }
}
```

`Schema.TaggedUnion` is the v4-native shorthand — each key becomes the `_tag`:

```ts
import { Schema } from 'effect'

const Shape = Schema.TaggedUnion({
  Circle: { radius: Schema.Number },
  Rectangle: { width: Schema.Number, height: Schema.Number },
})
type Shape = typeof Shape.Type

// Built-in exhaustive matcher (curried or direct)
const area = Shape.match({
  Circle: (c) => Math.PI * c.radius ** 2,
  Rectangle: (r) => r.width * r.height,
})

const shape = Schema.decodeUnknownSync(Shape)({ _tag: 'Circle', radius: 5 })
console.log(area(shape))
console.log(Shape.guards.Circle(shape)) // true
console.log(Shape.cases.Circle) // the Circle member schema
```

- v3 → v4: `Schema.Union(A, B)` → `Schema.Union([A, B])` — the variadic form is a type error in v4.
- Augment an existing union of tagged structs with the same utilities: `Schema.Union([A, B]).pipe(Schema.toTaggedUnion("_tag"))` (works for any discriminant key).
- v3 → v4: `attachPropertySignature("kind", "circle")` → add `kind: Schema.tagDefaultOmit("circle")` via `mapFields` (tag exists in `Type`, omitted from `Encoded`).
- `Schema.tag("A")` is a `Literal` with a constructor default — `Struct.make` fills it in automatically.

## Exhaustive matching with Match

For unions decoded by Schema, `Match.type<T>()` + `Match.tag` + `Match.exhaustive` gives compile-time exhaustiveness without `never` tricks. (For `TaggedUnion` schemas, prefer the built-in `.match` above.)

```ts
import { Match, Schema } from 'effect'

const QueueEvent = Schema.Union([
  Schema.TaggedStruct('Enqueued', { jobId: Schema.String }),
  Schema.TaggedStruct('Completed', { jobId: Schema.String, durationMs: Schema.Number }),
  Schema.TaggedStruct('Failed', { jobId: Schema.String, reason: Schema.String }),
])
type QueueEvent = typeof QueueEvent.Type

const summarize = Match.type<QueueEvent>().pipe(
  Match.tag('Enqueued', (e) => `queued ${e.jobId}`),
  Match.tag('Completed', (e) => `completed in ${e.durationMs}ms`),
  Match.tag('Failed', (e) => `failed: ${e.reason}`),
  Match.exhaustive, // compile error if a tag is unhandled
)

const event = Schema.decodeUnknownSync(QueueEvent)({ _tag: 'Enqueued', jobId: 'j1' })
console.log(summarize(event))
```

- `Match.tag` accepts multiple tags: `Match.tag("Enqueued", "Completed", (e) => ...)`.
- Use `Match.orElse(fallback)` instead of `Match.exhaustive` when you intentionally handle a subset.

## Composition: pick, omit, extend, merge, partial

Structs are composed through `mapFields` with helpers from the `Struct` module (the data module, not the schema constructor), or by spreading `.fields`. The v3 standalone combinators (`pick`, `omit`, `extend`, `partial`) are gone.

```ts
import { Schema, Struct } from 'effect'

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  password: Schema.String,
})

// pick / omit
const PublicUser = User.mapFields(Struct.omit(['password']))
const Credentials = User.mapFields(Struct.pick(['email', 'password']))

// extend: add fields (fieldsAssign is shorthand for mapFields(Struct.assign(...)))
const AdminUser = User.pipe(
  Schema.fieldsAssign({
    role: Schema.Literal('admin'),
    permissions: Schema.Array(Schema.String),
  }),
)

// merge: spread the .fields of several structs
const Audit = Schema.Struct({ createdAt: Schema.String, updatedAt: Schema.String })
const AuditedUser = Schema.Struct({ ...User.fields, ...Audit.fields })

// partial: map every field to optional
const UserPatch = User.mapFields(Struct.map(Schema.optionalKey))
// subset partial
const NamePatch = User.mapFields(Struct.mapPick(['name', 'email'], Schema.optionalKey))
```

- v3 → v4: `schema.pipe(Schema.pick("a"))` → `schema.mapFields(Struct.pick(["a"]))`; same for `omit`.
- v3 → v4: `Schema.extend(A, B)` → `A.mapFields(Struct.assign(B.fields))` or `A.pipe(Schema.fieldsAssign({ ... }))`.
- v3 → v4: `Schema.partial` → `mapFields(Struct.map(Schema.optional))` (allows undefined) or `Struct.map(Schema.optionalKey)` (exact).
- `mapFields` drops struct-level `.check(...)` constraints by default (fields changed, so checks may no longer apply); pass `{ unsafePreserveChecks: true }` only when you know they still hold.
- `Schema.extendTo(fields, derivations)` is not field merging: it adds **derived** fields computed from the decoded struct (each derivation returns `Option`), stripped again on encoding.
- v3 → v4: extending every member of a union (`Union.pipe(Schema.extend(S))`) → `union.mapMembers(Tuple.map(Schema.fieldsAssign({ ... })))`.

## Recursive schemas

Use `Schema.suspend` with an explicit interface annotation on the callback — without the annotation TypeScript cannot resolve the circular type.

```ts
import { Schema } from 'effect'

interface Category {
  readonly name: string
  readonly children: ReadonlyArray<Category>
}

const Category = Schema.Struct({
  name: Schema.String,
  children: Schema.Array(Schema.suspend((): Schema.Codec<Category> => Category)),
})

const tree = Schema.decodeUnknownSync(Category)({
  name: 'root',
  children: [{ name: 'leaf', children: [] }],
})
console.log(tree.children.length)
```

- Annotate the suspend callback, not the outer const: `Schema.suspend((): Schema.Codec<T> => Self)`. If `Type` and `Encoded` differ (transformations inside), declare both interfaces and use `Schema.Codec<T, E>`.
- Recursive unions work the same way — suspend the self-reference inside the union member fields.
- v3 → v4: the v3 idiom `const X: Schema.Schema<X> = Schema.suspend(() => ...)` (annotating the outer const) still compiles for simple cases but loses struct APIs (`.fields`, `mapFields`); the v4 idiom keeps the concrete struct type.

## Class-based schemas

`Schema.Class` survived and is the way to get nominal, method-carrying decoded types. `TaggedErrorClass` is the standard for domain errors.

```ts
import { Schema } from 'effect'

class Person extends Schema.Class<Person>('Person')({
  name: Schema.String,
  age: Schema.Number,
}) {
  get greeting(): string {
    return `Hi, ${this.name}`
  }
}

const alice = new Person({ name: 'Alice', age: 30 }) // validates, throws SchemaError if invalid
const bob = Schema.decodeUnknownSync(Person)({ name: 'Bob', age: 41 })
console.log(bob.greeting) // decoded values are real instances

class JobFailedError extends Schema.TaggedErrorClass<JobFailedError>()('JobFailedError', {
  jobId: Schema.String,
  reason: Schema.String,
}) {}
```

- Family: `Schema.Class` (plain), `Schema.TaggedClass` (auto `_tag` field), `Schema.ErrorClass`, `Schema.TaggedErrorClass` (yieldable Effect errors). Extend a class with `class Dog extends Animal.extend<Dog>("Dog")({ ... }) {}`.
- For a nominal type without class semantics, wrap a struct: `class UserId extends Schema.Opaque<UserId>()(Schema.Struct({ ... })) {}`.
- v3 → v4: `Schema.TaggedError` → `Schema.TaggedErrorClass`; `Schema.Data` is removed (v4 `Equal.equals` is structural by default).
