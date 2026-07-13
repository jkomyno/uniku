import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { xid } from 'uniku/xid'
import { generateXid } from '@/src/generators/xid'

describe('generateXid', () => {
  it.effect('generates XIDs with a supplied timestamp', () =>
    Effect.gen(function* () {
      const ids = yield* generateXid({ count: 3, timestamp: 1_720_000_000 })
      expect(ids).toHaveLength(3)
      expect(ids.every((id) => xid.isValid(id))).toBe(true)
      expect(ids.every((id) => xid.timestamp(id) === 1_720_000_000_000)).toBe(true)
    }),
  )
})
