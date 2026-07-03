import { afterEach } from 'vitest'
import { BufferError, ulid } from '@/src/ulid/ulid'

async function importFreshUlidModule() {
  vi.resetModules()
  return import('@/src/ulid/ulid')
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return left[i] - right[i]
    }
  }
  return 0
}

describe('ulid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a valid ULID string', () => {
    const id = ulid()
    expect(id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)
    expect(id.length).toBe(26)
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(ulid.NIL).toBe('00000000000000000000000000')
      expect(ulid.NIL.length).toBe(26)
    })

    it('has correct MAX constant', () => {
      expect(ulid.MAX).toBe('7ZZZZZZZZZZZZZZZZZZZZZZZZZ')
      expect(ulid.MAX.length).toBe(26)
    })

    it('NIL is valid', () => {
      expect(ulid.isValid(ulid.NIL)).toBe(true)
    })

    it('MAX is valid', () => {
      expect(ulid.isValid(ulid.MAX)).toBe(true)
    })

    it('NIL round-trips through bytes', () => {
      const bytes = ulid.toBytes(ulid.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(ulid.fromBytes(bytes)).toBe(ulid.NIL)
    })

    it('NIL has timestamp 0', () => {
      expect(ulid.timestamp(ulid.NIL)).toBe(0)
    })
  })

  it('generates uppercase output', () => {
    const id = ulid()
    expect(id).toBe(id.toUpperCase())
  })

  it('generates unique ids in small sample', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i += 1) {
      ids.add(ulid())
    }
    expect(ids.size).toBe(10_000)
  })

  it('encodes the timestamp in the first 6 bytes', () => {
    const ms = 1_702_387_456_789
    const bytes = ulid.toBytes(ulid({ msecs: ms, random: new Uint8Array(10) }))

    let decoded = 0
    for (let i = 0; i < 6; i += 1) {
      decoded = decoded * 256 + bytes[i]
    }

    expect(decoded).toBe(ms)
  })

  it('extracts timestamp correctly', () => {
    const ms = 1_702_387_456_789
    const id = ulid({ msecs: ms, random: new Uint8Array(10) })
    expect(ulid.timestamp(id)).toBe(ms)
  })

  it('increases lexicographically within the same millisecond', async () => {
    const { ulid: freshUlid } = await importFreshUlidModule()
    const ms = 1_702_387_456_789
    vi.spyOn(Date, 'now').mockReturnValue(ms)
    const samples = 1_000
    const ids = new Array<string>(samples)

    for (let i = 0; i < samples; i += 1) {
      ids[i] = freshUlid()
    }

    for (let i = 0; i < samples - 1; i += 1) {
      // ULIDs should sort lexicographically
      expect(ids[i] < ids[i + 1]).toBe(true)
    }
  })

  it('increases bytes within the same millisecond', async () => {
    const { ulid: freshUlid } = await importFreshUlidModule()
    const ms = 1_702_387_456_789
    vi.spyOn(Date, 'now').mockReturnValue(ms)
    const samples = 1_000
    const bytesList = new Array<Uint8Array>(samples)

    for (let i = 0; i < samples; i += 1) {
      bytesList[i] = freshUlid.toBytes(freshUlid())
    }

    for (let i = 0; i < samples - 1; i += 1) {
      expect(compareBytes(bytesList[i], bytesList[i + 1])).toBeLessThan(0)
    }
  })

  it('preserves monotonic order and timestamp when the clock moves backwards', async () => {
    const { ulid: freshUlid } = await importFreshUlidModule()
    const ms = 1_702_387_456_789
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(ms)
      .mockReturnValueOnce(ms - 5_000)

    const first = freshUlid()
    const second = freshUlid()

    expect(first < second).toBe(true)
    expect(freshUlid.timestamp(first)).toBe(ms)
    expect(freshUlid.timestamp(second)).toBe(ms)
  })

  it('round-trips through byte helpers', () => {
    const id = ulid()
    expect(ulid.fromBytes(ulid.toBytes(id))).toBe(id)
  })

  it('round-trips with lowercase input', () => {
    const id = ulid()
    const lower = id.toLowerCase()
    expect(ulid.fromBytes(ulid.toBytes(lower))).toBe(id)
  })

  it('supports custom timestamp option', () => {
    const ms = 1_500_000_000_000
    const id = ulid({ msecs: ms })
    expect(ulid.timestamp(id)).toBe(ms)
  })

  it('supports custom random option', () => {
    const random = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const id1 = ulid({ msecs: 1000, random })
    const id2 = ulid({ msecs: 1000, random })
    expect(id1).toBe(id2)
  })

  it('throws on insufficient random bytes', () => {
    expect(() => ulid({ random: new Uint8Array(9) })).toThrow('Random bytes length must be >= 10 for ULID')
    expect(() => ulid({ random: new Uint8Array(5) })).toThrow('Random bytes length must be >= 10 for ULID')
    expect(() => ulid({ random: new Uint8Array(0) })).toThrow('Random bytes length must be >= 10 for ULID')
  })

  it('accepts random bytes with exactly 10 bytes', () => {
    const random = new Uint8Array(10).fill(42)
    expect(() => ulid({ random })).not.toThrow()
  })

  it('accepts random bytes with more than 10 bytes', () => {
    const random = new Uint8Array(16).fill(42)
    expect(() => ulid({ random })).not.toThrow()
  })

  it('supports buffer output', () => {
    const buffer = new Uint8Array(32)
    const offset = 8

    const result = ulid({ msecs: 1_702_387_456_789, random: new Uint8Array(10) }, buffer, offset)
    expect(result).toBe(buffer)

    const fromString = ulid.toBytes(ulid({ msecs: 1_702_387_456_789, random: new Uint8Array(10) }))
    for (let i = 0; i < fromString.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromString[i])
    }
  })

  it('throws on buffer bounds error', () => {
    const buffer = new Uint8Array(10)
    expect(() => ulid({}, buffer, 0)).toThrow(BufferError)
  })

  describe('isValid', () => {
    it('returns true for valid ULIDs', () => {
      expect(ulid.isValid(ulid())).toBe(true)
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(ulid.isValid('7ZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(true)
      expect(ulid.isValid('00000000000000000000000000')).toBe(true)
    })

    it('returns true for lowercase valid ULIDs', () => {
      expect(ulid.isValid('01arz3ndektsv4rrffq69g5fav')).toBe(true)
    })

    it('returns false for wrong length', () => {
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FA')).toBe(false)
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAVX')).toBe(false)
      expect(ulid.isValid('')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toBe(false) // I is invalid
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAL')).toBe(false) // L is invalid
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAO')).toBe(false) // O is invalid
      expect(ulid.isValid('01ARZ3NDEKTSV4RRFFQ69G5FAU')).toBe(false) // U is invalid
    })

    it('returns false for overflow (first char > 7)', () => {
      expect(ulid.isValid('81ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false)
      expect(ulid.isValid('91ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false)
      expect(ulid.isValid('A1ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(ulid.isValid(null)).toBe(false)
      expect(ulid.isValid(undefined)).toBe(false)
      expect(ulid.isValid(123)).toBe(false)
      expect(ulid.isValid({})).toBe(false)
      expect(ulid.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = ulid()
      if (ulid.isValid(maybeId)) {
        // TypeScript should know maybeId is string here
        expect(maybeId.length).toBe(26)
      }
    })
  })

  describe('timestamp edge cases', () => {
    it('handles zero timestamp', () => {
      const id = ulid({ msecs: 0, random: new Uint8Array(10) })
      expect(ulid.timestamp(id)).toBe(0)
      expect(id.slice(0, 10)).toBe('0000000000')
    })

    it('handles max safe timestamp', () => {
      // Max ULID timestamp: 2^48 - 1 = 281474976710655
      const maxTs = 281474976710655
      const id = ulid({ msecs: maxTs, random: new Uint8Array(10).fill(0xff) })
      expect(ulid.timestamp(id)).toBe(maxTs)
    })
  })

  describe('monotonic increment behavior', () => {
    it('increments random portion within same millisecond', async () => {
      const { ulid: freshUlid } = await importFreshUlidModule()
      // Test that the internal incrementBytes function correctly handles
      // monotonic ordering by verifying consecutive IDs are strictly increasing
      const ms = 1_702_387_456_789
      vi.spyOn(Date, 'now').mockReturnValue(ms)

      // Generate many IDs in the same millisecond
      // The random portion should be incrementing each time
      const ids: string[] = []
      for (let i = 0; i < 100; i += 1) {
        ids[i] = freshUlid()
      }

      // Verify all IDs are strictly increasing (monotonic)
      for (let i = 0; i < ids.length - 1; i += 1) {
        expect(ids[i] < ids[i + 1]).toBe(true)
      }

      // Verify the timestamp portion is the same for all
      const firstTimestamp = ids[0].slice(0, 10)
      for (const id of ids) {
        expect(id.slice(0, 10)).toBe(firstTimestamp)
      }

      // Verify the random portions are different (incremented)
      const randomParts = new Set(ids.map((id) => id.slice(10)))
      expect(randomParts.size).toBe(ids.length)
    })

    it('throws when the monotonic random portion overflows', async () => {
      vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
        if (array instanceof Uint8Array) {
          array.fill(0xff)
        }
        return array
      })

      const { InvalidInputError, ulid: freshUlid } = await importFreshUlidModule()
      const ms = 1_702_387_456_789
      vi.spyOn(Date, 'now').mockReturnValue(ms)

      freshUlid()

      let error: unknown
      try {
        freshUlid()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({
        code: 'ULID_RANDOM_OVERFLOW',
        message: 'ULID random component overflowed while preserving monotonic order',
      })
    })
  })
})
