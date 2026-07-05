import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { generateTypeid } from '@/src/generators/typeid'

describe('generateTypeid', () => {
  it.effect('generates a single prefixless TypeID by default', () =>
    Effect.gen(function* () {
      const ids = yield* generateTypeid({ count: 1, prefix: '' })
      expect(ids).toHaveLength(1)
      expect(ids[0]).toMatch(/^[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
    }),
  )

  it.effect('generates prefixed TypeIDs', () =>
    Effect.gen(function* () {
      const ids = yield* generateTypeid({ count: 2, prefix: 'user' })
      expect(ids).toHaveLength(2)
      expect(ids[0]).toMatch(/^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
      expect(ids[1]).toMatch(/^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
    }),
  )

  it.effect('generates 0 IDs when count is 0', () =>
    Effect.gen(function* () {
      const ids = yield* generateTypeid({ count: 0, prefix: 'user' })
      expect(ids).toHaveLength(0)
    }),
  )
})
