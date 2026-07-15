import { expect, test } from 'bun:test'
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

test('generates a prefixed TypeID through an Effect service', () => {
  const userId = Effect.runSync(program.pipe(Effect.provide(UserIds.layer)))
  // Example: userId = 'user_01kxjp5jcqej3tm5bgqj6mz05r'

  console.log('userId:', userId)

  expect(typeid.isValid(userId)).toBe(true)
  expect(typeid.prefix(userId)).toBe('user')
})
