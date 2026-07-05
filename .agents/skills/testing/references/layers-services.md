# Layers And Services

Open this when injecting Effect service ports, sharing test layers, or replacing module mocks with service fixtures.

Use layers to inject test ports. Return service values with `Service.of(...)`; do not leak adapter-specific types into domain tests.

```ts
import { assert, layer } from '@effect/vitest'
import { Context, Effect, Layer, Ref } from 'effect'

class Counter extends Context.Service<
  Counter,
  {
    readonly increment: Effect.Effect<number>
    readonly current: Effect.Effect<number>
  }
>()('test/Counter') {
  static readonly layer = Layer.effect(
    Counter,
    Effect.gen(function* () {
      const ref = yield* Ref.make(0)

      return Counter.of({
        increment: Ref.updateAndGet(ref, (value) => value + 1),
        current: Ref.get(ref),
      })
    }),
  )
}

layer(Counter.layer)('Counter', (it) => {
  it.effect('tracks state through the service port', () =>
    Effect.gen(function* () {
      const counter = yield* Counter

      assert.strictEqual(yield* counter.current, 0)
      assert.strictEqual(yield* counter.increment, 1)
      assert.strictEqual(yield* counter.current, 1)
    }),
  )
})
```

Top-level `layer(...)` shares one layer for the block and closes it after the block. Use that for intentionally shared setup. For per-test state, provide a fresh layer inside each `it.effect` or use separate `it.layer(...)` blocks.
