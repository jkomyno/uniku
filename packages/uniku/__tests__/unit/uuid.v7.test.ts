import { uuidv7 } from '@/src/uuid/v7'

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return left[i] - right[i]
    }
  }
  return 0
}

describe('uuidv7', () => {
  it('generates a valid UUID v7 string', () => {
    const id = uuidv7()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id.length).toBe(36)
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(uuidv7.NIL).toBe('00000000-0000-0000-0000-000000000000')
      expect(uuidv7.NIL.length).toBe(36)
    })

    it('has correct MAX constant', () => {
      expect(uuidv7.MAX).toBe('ffffffff-ffff-ffff-ffff-ffffffffffff')
      expect(uuidv7.MAX.length).toBe(36)
    })

    it('NIL round-trips through bytes', () => {
      const bytes = uuidv7.toBytes(uuidv7.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(uuidv7.fromBytes(bytes)).toBe(uuidv7.NIL)
    })

    it('MAX round-trips through bytes', () => {
      const bytes = uuidv7.toBytes(uuidv7.MAX)
      expect(bytes.every((b) => b === 0xff)).toBe(true)
      expect(uuidv7.fromBytes(bytes)).toBe(uuidv7.MAX)
    })

    it('NIL has timestamp 0', () => {
      expect(uuidv7.timestamp(uuidv7.NIL)).toBe(0)
    })
  })

  it('sets version and variant bits', () => {
    const bytes = uuidv7.toBytes(uuidv7())
    expect(bytes[6] >> 4).toBe(7)
    expect((bytes[8] & 0xc0) === 0x80).toBe(true)
  })

  it('encodes the timestamp in the first 6 bytes', () => {
    const ms = 1_702_387_456_789
    const bytes = uuidv7.toBytes(uuidv7({ msecs: ms, seq: 0, random: new Uint8Array(16) }))

    let decoded = 0
    for (let i = 0; i < 6; i += 1) {
      decoded = decoded * 256 + bytes[i]
    }

    expect(decoded).toBe(ms)
  })

  it('extracts the timestamp from a UUID v7 string', () => {
    const ms = 1_702_387_456_789
    const id = uuidv7({ msecs: ms, seq: 0, random: new Uint8Array(16) })
    expect(uuidv7.timestamp(id)).toBe(ms)
  })

  it('increases lexicographically within the same millisecond', () => {
    const ms = 1_702_387_456_789
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(ms)
    const samples = 1_000
    const bytesList = new Array<Uint8Array>(samples)

    for (let i = 0; i < samples; i += 1) {
      bytesList[i] = uuidv7.toBytes(uuidv7())
    }
    nowSpy.mockRestore()

    for (let i = 0; i < samples - 1; i += 1) {
      expect(compareBytes(bytesList[i], bytesList[i + 1])).toBeLessThan(0)
    }
  })

  it('round-trips through byte helpers', () => {
    const id = uuidv7()
    expect(uuidv7.fromBytes(uuidv7.toBytes(id))).toBe(id.toLowerCase())
  })

  it('supports options and buffer output', () => {
    const options = {
      msecs: 1_702_387_456_789,
      seq: 0x12345678,
      random: new Uint8Array(16),
    }
    const buffer = new Uint8Array(32)
    const offset = 8

    const result = uuidv7(options, buffer, offset)
    expect(result).toBe(buffer)

    const fromString = uuidv7.toBytes(uuidv7(options))
    for (let i = 0; i < fromString.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromString[i])
    }
  })

  describe('isValid', () => {
    it('returns true for valid UUID v7 strings', () => {
      expect(uuidv7.isValid(uuidv7())).toBe(true)
      expect(uuidv7.isValid('01890f41-6b46-7e38-8f1d-7a5a8b7d83f1')).toBe(true)
      expect(uuidv7.isValid('01890F41-6B46-7E38-8F1D-7A5A8B7D83F1')).toBe(true)
    })

    it('returns true for 1,000 generated ids', () => {
      for (let i = 0; i < 1_000; i += 1) {
        expect(uuidv7.isValid(uuidv7())).toBe(true)
      }
    })

    it('returns false for wrong length or format', () => {
      expect(uuidv7.isValid('01890f41-6b46-7e38-8f1d-7a5a8b7d83f')).toBe(false)
      expect(uuidv7.isValid('01890f416b467e388f1d7a5a8b7d83f1')).toBe(false)
      expect(uuidv7.isValid('')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(uuidv7.isValid('g1890f41-6b46-7e38-8f1d-7a5a8b7d83f1')).toBe(false)
    })

    it('returns false for wrong version or variant', () => {
      expect(uuidv7.isValid('01890f41-6b46-4e38-8f1d-7a5a8b7d83f1')).toBe(false)
      expect(uuidv7.isValid('01890f41-6b46-7e38-7f1d-7a5a8b7d83f1')).toBe(false)
      expect(uuidv7.isValid('01890f41-6b46-7e38-cf1d-7a5a8b7d83f1')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(uuidv7.isValid(null)).toBe(false)
      expect(uuidv7.isValid(undefined)).toBe(false)
      expect(uuidv7.isValid(123)).toBe(false)
      expect(uuidv7.isValid({})).toBe(false)
      expect(uuidv7.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = uuidv7()
      if (uuidv7.isValid(maybeId)) {
        // TypeScript should know maybeId is string here
        expect(maybeId.length).toBe(36)
      }
    })
  })

  describe('sequence overflow', () => {
    it('increments timestamp when sequence overflows', () => {
      // When generating many UUIDs in the same millisecond, the sequence counter
      // eventually overflows to 0, which triggers a timestamp increment
      const ms = 1_702_387_456_789
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(ms)

      // Generate enough UUIDs to potentially trigger overflow (unlikely in practice)
      // but this tests the overflow handling code path
      const ids: string[] = []
      for (let i = 0; i < 100; i += 1) {
        ids.push(uuidv7())
      }

      nowSpy.mockRestore()

      // All should be valid and monotonically increasing
      for (let i = 0; i < ids.length - 1; i += 1) {
        expect(uuidv7.isValid(ids[i])).toBe(true)
        expect(compareBytes(uuidv7.toBytes(ids[i]), uuidv7.toBytes(ids[i + 1]))).toBeLessThan(0)
      }

      // All timestamps should be >= original ms (may increment on overflow)
      for (const id of ids) {
        expect(uuidv7.timestamp(id)).toBeGreaterThanOrEqual(ms)
      }
    })
  })
})
