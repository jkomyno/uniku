import assert from 'node:assert/strict'
import { Context, Effect, Layer } from 'effect'
import { typeid } from 'uniku/typeid'

class UserIds extends Context.Service<
  UserIds,
  {
    readonly next: () => Effect.Effect<string>
  }
>()('examples/UserIds') {
  static readonly layer = Layer.effect(
    UserIds,
    Effect.gen(function* () {
      const next = Effect.fn('UserIds.next')(function* () {
        return yield* Effect.sync(() => typeid('user'))
      })

      return UserIds.of({ next })
    }),
  )
}

const program = Effect.gen(function* () {
  const userIds = yield* UserIds
  return yield* userIds.next()
})

const userId = Effect.runSync(program.pipe(Effect.provide(UserIds.layer)))

assert(typeid.isValid(userId))
assert.equal(typeid.prefix(userId), 'user')

console.log({ userId })
