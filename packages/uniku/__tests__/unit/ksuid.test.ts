import { BufferError, InvalidInputError, ksuid } from '@/src/ksuid/ksuid'
import { expectValidTypeGuard } from '../helpers/assertions'
import { expectDistinctRandomSamples } from '../helpers/randomness'

const KSUID_EPOCH = 1_400_000_000
const KSUID_MAX_SECS = KSUID_EPOCH + 0xffffffff

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return left[i] - right[i]
    }
  }
  return 0
}

describe('ksuid', () => {
  it('generates a valid KSUID string', () => {
    const id = ksuid()
    expect(id).toMatch(/^[0-9A-Za-z]{27}$/)
    expect(id.length).toBe(27)
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(ksuid.NIL).toBe('000000000000000000000000000')
      expect(ksuid.NIL.length).toBe(27)
    })

    it('has correct MAX constant', () => {
      expect(ksuid.MAX).toBe('aWgEPTl1tmebfsQzFP4bxwgy80V')
      expect(ksuid.MAX.length).toBe(27)
    })

    it('NIL is valid', () => {
      expect(ksuid.isValid(ksuid.NIL)).toBe(true)
    })

    it('MAX is valid', () => {
      expect(ksuid.isValid(ksuid.MAX)).toBe(true)
    })

    it('NIL round-trips through bytes', () => {
      const bytes = ksuid.toBytes(ksuid.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(ksuid.fromBytes(bytes)).toBe(ksuid.NIL)
    })

    it('MAX round-trips through bytes', () => {
      const bytes = ksuid.toBytes(ksuid.MAX)
      expect(bytes.every((b) => b === 0xff)).toBe(true)
      expect(ksuid.fromBytes(bytes)).toBe(ksuid.MAX)
    })
  })

  it('generates unique ids in small sample', () => {
    expectDistinctRandomSamples({
      count: 10_000,
      randomBits: 128,
      generate: ksuid,
    })
  })

  it('encodes the timestamp in the first 4 bytes', () => {
    const msecs = 1_702_387_456_000 // Unix timestamp in milliseconds
    const expectedKsuidSecs = 1_702_387_456 - 1400000000 // KSUID epoch

    const bytes = ksuid.toBytes(ksuid({ msecs, random: new Uint8Array(16) }))

    const decoded = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

    expect(decoded).toBe(expectedKsuidSecs)
  })

  it('extracts timestamp correctly', () => {
    const msecs = 1_702_387_456_000 // Unix timestamp in milliseconds
    const id = ksuid({ msecs, random: new Uint8Array(16) })
    expect(ksuid.timestamp(id)).toBe(msecs) // timestamp() returns milliseconds
  })

  it('round-trips through byte helpers', () => {
    const id = ksuid()
    expect(ksuid.fromBytes(ksuid.toBytes(id))).toBe(id)
  })

  it('supports custom timestamp option', () => {
    const msecs = 1_500_000_000_000
    const id = ksuid({ msecs })
    expect(ksuid.timestamp(id)).toBe(msecs) // timestamp() returns milliseconds
  })

  it('supports custom random option', () => {
    const random = new Uint8Array(16).fill(42)
    const id1 = ksuid({ msecs: 1_500_000_000_000, random })
    const id2 = ksuid({ msecs: 1_500_000_000_000, random })
    expect(id1).toBe(id2)
  })

  it('throws on insufficient random bytes', () => {
    expect(() => ksuid({ random: new Uint8Array(15) })).toThrow('Random bytes length must be >= 16 for KSUID')
    expect(() => ksuid({ random: new Uint8Array(10) })).toThrow('Random bytes length must be >= 16 for KSUID')
    expect(() => ksuid({ random: new Uint8Array(0) })).toThrow('Random bytes length must be >= 16 for KSUID')
  })

  it('accepts random bytes with exactly 16 bytes', () => {
    const random = new Uint8Array(16).fill(42)
    expect(() => ksuid({ random })).not.toThrow()
  })

  it('accepts random bytes with more than 16 bytes', () => {
    const random = new Uint8Array(32).fill(42)
    expect(() => ksuid({ random })).not.toThrow()
  })

  it('supports buffer output', () => {
    const buffer = new Uint8Array(32)
    const offset = 8

    const result = ksuid({ msecs: 1_702_387_456_000, random: new Uint8Array(16) }, buffer, offset)
    expect(result).toBe(buffer)

    const fromString = ksuid.toBytes(ksuid({ msecs: 1_702_387_456_000, random: new Uint8Array(16) }))
    for (let i = 0; i < fromString.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromString[i])
    }
  })

  it('throws on buffer bounds error', () => {
    const buffer = new Uint8Array(10)
    expect(() => ksuid({}, buffer, 0)).toThrow(BufferError)
  })

  describe('isValid', () => {
    it('returns true for valid KSUIDs', () => {
      expect(ksuid.isValid(ksuid())).toBe(true)
      // Known valid KSUID examples from Segment
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1K')).toBe(true)
      expect(ksuid.isValid('0ujtsYcgvSTl8PAuAdqWYSMnLOv')).toBe(true)
    })

    it('validates format and numeric range correctly', () => {
      // Base62 allows any mix of 0-9, A-Z, a-z within the 160-bit KSUID range.
      expect(ksuid.isValid('000000000000000000000000000')).toBe(true) // all zeros
      expect(ksuid.isValid('ZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(true) // all uppercase Z
      expect(ksuid.isValid('zzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false) // exceeds 160 bits
    })

    it('returns false for wrong length', () => {
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1')).toBe(false) // 26 chars
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1KX')).toBe(false) // 28 chars
      expect(ksuid.isValid('')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf-tY1K')).toBe(false) // hyphen
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf_tY1K')).toBe(false) // underscore
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf+tY1K')).toBe(false) // plus
    })

    it('returns false for non-strings', () => {
      expect(ksuid.isValid(123)).toBe(false)
      expect(ksuid.isValid(null)).toBe(false)
      expect(ksuid.isValid(undefined)).toBe(false)
      expect(ksuid.isValid({})).toBe(false)
      expect(ksuid.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = ksuid()
      expectValidTypeGuard<string>(maybeId, ksuid.isValid)
      expect(maybeId.length).toBe(27)
    })
  })

  describe('decoder validation', () => {
    const invalidIds = [
      '0ujsswThIGTUYm2K8FjOOfXtY1',
      '0ujsswThIGTUYm2K8FjOOfXtY1KX',
      '0ujsswThIGTUYm2K8FjOOf-tY1K',
      '€'.repeat(27),
      'z'.repeat(27),
    ]

    it('throws from toBytes for IDs rejected by isValid', () => {
      for (const id of invalidIds) {
        expect(ksuid.isValid(id)).toBe(false)
        expect(() => ksuid.toBytes(id)).toThrow()
      }
    })

    it('round-trips the maximum valid KSUID', () => {
      expect(ksuid.fromBytes(ksuid.toBytes(ksuid.MAX))).toBe(ksuid.MAX)
    })
  })

  describe('timestamp edge cases', () => {
    it('handles KSUID epoch boundary', () => {
      // KSUID epoch: May 13, 2014 (1400000000 seconds since Unix epoch)
      const epochMsecs = KSUID_EPOCH * 1000
      const id = ksuid({ msecs: epochMsecs, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(epochMsecs) // timestamp() returns milliseconds
      // First 4 bytes should be 0 at the epoch
      const bytes = ksuid.toBytes(id)
      expect(bytes[0]).toBe(0)
      expect(bytes[1]).toBe(0)
      expect(bytes[2]).toBe(0)
      expect(bytes[3]).toBe(0)
    })

    it('handles timestamp well after epoch', () => {
      // A timestamp well into the future from KSUID epoch
      const msecs = 2_000_000_000_000 // ~2033
      const id = ksuid({ msecs, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(msecs) // timestamp() returns milliseconds
    })

    it('truncates sub-second precision to whole seconds', () => {
      const id = ksuid({ msecs: 1_500_000_000_999, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(1_500_000_000_000)
    })

    it('does not mutate reusable timestamp options', () => {
      const msecs = 1_700_000_000_000
      const options = { msecs, random: new Uint8Array(16).fill(7) }

      const first = ksuid(options)
      const second = ksuid(options)

      expect(options.msecs).toBe(msecs)
      expect(second).toBe(first)
      expect(ksuid.timestamp(second)).toBe(msecs)
    })

    it('throws for Unix epoch timestamp before KSUID epoch', () => {
      expect(() => ksuid({ msecs: 0, random: new Uint8Array(16) })).toThrow(
        `Timestamp must be an integer between ${KSUID_EPOCH * 1000} and ${KSUID_MAX_SECS * 1000 + 999} milliseconds`,
      )
    })

    it('accepts the maximum 32-bit KSUID timestamp', () => {
      const id = ksuid({ msecs: KSUID_MAX_SECS * 1000, random: new Uint8Array(16) })
      const bytes = ksuid.toBytes(id)

      expect(ksuid.timestamp(id)).toBe(KSUID_MAX_SECS * 1000)
      expect(Array.from(bytes.subarray(0, 4))).toEqual([0xff, 0xff, 0xff, 0xff])
    })

    it('accepts sub-second precision at the maximum 32-bit KSUID timestamp', () => {
      const id = ksuid({ msecs: KSUID_MAX_SECS * 1000 + 999, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(KSUID_MAX_SECS * 1000)
    })

    it('throws for timestamps above the 32-bit KSUID range', () => {
      expect(() => ksuid({ msecs: (KSUID_MAX_SECS + 1) * 1000, random: new Uint8Array(16) })).toThrow(
        `Timestamp must be an integer between ${KSUID_EPOCH * 1000} and ${KSUID_MAX_SECS * 1000 + 999} milliseconds`,
      )
    })
  })

  describe('deprecated secs alias', () => {
    // TODO(v1-rc): remove this block together with the `secs` option.
    it('accepts whole seconds until v1-rc', () => {
      const id = ksuid({ secs: 1_500_000_000, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(1_500_000_000_000)
    })

    it('validates the seconds range', () => {
      expect(() => ksuid({ secs: 0 })).toThrow(
        `Timestamp must be an integer between ${KSUID_EPOCH} and ${KSUID_MAX_SECS} seconds`,
      )
    })

    it('rejects passing both msecs and secs', () => {
      let error: unknown
      try {
        ksuid({ msecs: 1_500_000_000_000, secs: 1_500_000_000 })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'CONFLICTING_OPTIONS', strategy: 'ksuid' })
    })
  })

  describe('Base62 encoding edge cases', () => {
    it('encodes minimum KSUID (all zeros)', () => {
      const bytes = new Uint8Array(20).fill(0)
      const encoded = ksuid.fromBytes(bytes)
      expect(encoded).toBe('000000000000000000000000000')
      expect(encoded.length).toBe(27)
    })

    it('decodes minimum KSUID', () => {
      const decoded = ksuid.toBytes('000000000000000000000000000')
      expect(decoded.every((b) => b === 0)).toBe(true)
    })

    it('round-trips various byte patterns', () => {
      // All 0xFF
      const maxBytes = new Uint8Array(20).fill(0xff)
      expect(compareBytes(ksuid.toBytes(ksuid.fromBytes(maxBytes)), maxBytes)).toBe(0)

      // Alternating pattern
      const altBytes = new Uint8Array(20)
      for (let i = 0; i < 20; i += 1) {
        altBytes[i] = i % 2 === 0 ? 0xaa : 0x55
      }
      expect(compareBytes(ksuid.toBytes(ksuid.fromBytes(altBytes)), altBytes)).toBe(0)
    })
  })
})
