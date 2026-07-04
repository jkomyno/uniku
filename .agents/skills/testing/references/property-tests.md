# Property Tests

Open this when adding Schema-backed property tests or custom generators.

Use `it.effect.prop` with Schema-backed arbitraries for domain values, or `FastCheck` from `effect/testing` when the generator needs custom constraints.

```ts
import { assert, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'

it.effect.prop('trim is idempotent', [Schema.String], ([value]) =>
  Effect.gen(function* () {
    const once = value.trim()
    assert.strictEqual(once.trim(), once)
  }),
)
```

Prefer generated inputs for stable invariants, codec round trips, parser normalizers, retry policy classification, and small pure domain transformations. Keep examples explicit when debugging a known regression.
