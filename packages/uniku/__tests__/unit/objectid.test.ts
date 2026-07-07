import { ksuid } from '@/src/ksuid/ksuid'
import { BufferError, InvalidInputError, objectid, ParseError } from '@/src/objectid/objectid'
import { ulid } from '@/src/ulid/ulid'
import { expectValidTypeGuard } from '../helpers/assertions'
import { expectDistinctRandomSamples } from '../helpers/randomness'

describe('objectid', () => {
  it('generates a valid ObjectID string', () => {
    const id = objectid()
    expect(id).toMatch(/^[0-9a-f]{24}$/)
    expect(id.length).toBe(24)
  })

  it('two consecutive no-option calls differ and sort in increasing order', () => {
    vi.setSystemTime(1_700_000_000_000)

    const first = objectid()
    const second = objectid()

    expect(second).not.toBe(first)
    expect(second > first).toBe(true)

    vi.useRealTimers()
  })

  it('produces a specific hand-computed hex string for fixed inputs (test vector)', () => {
    const random = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])
    const id = objectid({ secs: 1_700_000_000, random, counter: 0x010203 })
    expect(id).toBe('6553f1000102030405010203')
  })

  it('embeds the given timestamp exactly', () => {
    const secs = 1_702_387_456
    const id = objectid({ secs, random: new Uint8Array(5), counter: 0 })
    expect(objectid.timestamp(id)).toBe(secs * 1000)
  })

  it('supports buffer output at a given offset', () => {
    const buffer = new Uint8Array(32)
    const offset = 8
    const options = { secs: 1_702_387_456, random: new Uint8Array([1, 2, 3, 4, 5]), counter: 0xabcdef }

    const result = objectid(options, buffer, offset)
    expect(result).toBe(buffer)

    const fromString = objectid.toBytes(objectid(options))
    for (let i = 0; i < fromString.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromString[i])
    }
  })

  describe('boundary values', () => {
    it('round-trips counter at 0 and 0xFFFFFF', () => {
      for (const counter of [0, 0xffffff]) {
        const id = objectid({ secs: 1_700_000_000, random: new Uint8Array(5), counter })
        const bytes = objectid.toBytes(id)
        expect(objectid.fromBytes(bytes)).toBe(id)
      }
    })

    it('round-trips secs at 0 and 0xFFFFFFFF', () => {
      for (const secs of [0, 0xffffffff]) {
        const id = objectid({ secs, random: new Uint8Array(5), counter: 0 })
        expect(objectid.timestamp(id)).toBe(secs * 1000)
      }
    })
  })

  describe('error paths', () => {
    it('throws on insufficient random bytes', () => {
      expect(() => objectid({ random: new Uint8Array(4) })).toThrow(InvalidInputError)
      expect(() => objectid({ random: new Uint8Array(4) })).toThrow('Random bytes length must be >= 5 for ObjectID')
      expect(() => objectid({ random: new Uint8Array(0) })).toThrow(InvalidInputError)
    })

    it('accepts random bytes with more than 5 bytes', () => {
      expect(() => objectid({ random: new Uint8Array(16) })).not.toThrow()
    })

    it('throws when secs is outside the unsigned 32-bit range', () => {
      expect(() => objectid({ secs: -1 })).toThrow(InvalidInputError)
      expect(() => objectid({ secs: 0x100000000 })).toThrow(InvalidInputError)
    })

    it('throws when counter is outside the unsigned 24-bit range', () => {
      expect(() => objectid({ counter: -1 })).toThrow(InvalidInputError)
      expect(() => objectid({ counter: 0x1000000 })).toThrow(InvalidInputError)
    })

    it('throws on buffer bounds error', () => {
      const buffer = new Uint8Array(10)
      expect(() => objectid({}, buffer, 0)).toThrow(BufferError)
    })

    it('throws ParseError from toBytes for wrong-length strings', () => {
      expect(() => objectid.toBytes('abc')).toThrow(ParseError)
      expect(() => objectid.toBytes('a'.repeat(25))).toThrow(ParseError)
    })

    it('throws ParseError from toBytes for non-hex characters', () => {
      expect(() => objectid.toBytes('g'.repeat(24))).toThrow(ParseError)
      expect(() => objectid.toBytes('€'.repeat(24))).toThrow(ParseError)
    })
  })

  describe('round-trips', () => {
    it('round-trips through byte helpers for a hot-path generated id', () => {
      const id = objectid()
      expect(objectid.fromBytes(objectid.toBytes(id))).toBe(id)
    })

    it('round-trips through byte helpers for a deterministic-path generated id', () => {
      const id = objectid({ secs: 1_700_000_000, random: new Uint8Array([9, 8, 7, 6, 5]), counter: 42 })
      expect(objectid.fromBytes(objectid.toBytes(id))).toBe(id)
    })
  })

  it('draws an independent random field on the options path even when the shared pool is exhausted mid-call by the counter draw', () => {
    // Regression: the options path used to hold a *view* into the shared random pool
    // (`rng().subarray(0, 5)`) while a later randomUint32() call (for the default
    // counter) could refill that same pool before the view was consumed, silently
    // aliasing the embedded random bytes with whatever the pool held after refill.
    // Interleaving with other generators maximizes pool-refill pressure between the
    // random draw and the counter draw on each objectid({ secs }) call.
    const secs = 1_700_000_000
    expectDistinctRandomSamples({
      count: 5_000,
      randomBits: 40,
      generate: () => {
        ulid()
        ksuid()
        return objectid({ secs })
      },
    })
  })

  it('persists the random value across no-option calls even when the shared random pool is exhausted by other generators', () => {
    const first = objectid()
    const firstRandom = first.slice(8, 18) // bytes 4-8 as hex (10 chars)

    // Exhaust and refill the shared random pool many times via other generators.
    for (let i = 0; i < 64; i += 1) {
      ulid()
      ksuid()
    }

    const second = objectid()
    const secondRandom = second.slice(8, 18)

    expect(secondRandom).toBe(firstRandom)
  })

  describe('isValid', () => {
    it('returns true for valid ObjectIDs', () => {
      expect(objectid.isValid(objectid())).toBe(true)
    })

    it('is case-insensitive', () => {
      expect('AABBCCDDEEFF001122334455').toHaveLength(24)
      expect(objectid.isValid('AABBCCDDEEFF001122334455')).toBe(true)
      expect(objectid.isValid('aabbccddeeff001122334455')).toBe(true)
      expect(objectid.isValid('AaBbCcDdEeFf001122334455')).toBe(true)
    })

    it('returns false for wrong length', () => {
      expect(objectid.isValid('a'.repeat(23))).toBe(false)
      expect(objectid.isValid('a'.repeat(25))).toBe(false)
      expect(objectid.isValid('')).toBe(false)
    })

    it('returns false for non-hex characters', () => {
      expect(objectid.isValid('g'.repeat(24))).toBe(false)
      expect(objectid.isValid(`${'a'.repeat(23)}-`)).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(objectid.isValid(123)).toBe(false)
      expect(objectid.isValid(null)).toBe(false)
      expect(objectid.isValid(undefined)).toBe(false)
      expect(objectid.isValid({})).toBe(false)
      expect(objectid.isValid([])).toBe(false)
    })

    it('acts as a type guard', () => {
      const maybeId: unknown = objectid()
      expectValidTypeGuard<string>(maybeId, objectid.isValid)
      expect(maybeId.length).toBe(24)
    })
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(objectid.NIL).toBe('0'.repeat(24))
      expect(objectid.NIL.length).toBe(24)
    })

    it('has correct MAX constant', () => {
      expect(objectid.MAX).toBe('f'.repeat(24))
      expect(objectid.MAX.length).toBe(24)
    })

    it('NIL is valid', () => {
      expect(objectid.isValid(objectid.NIL)).toBe(true)
    })

    it('MAX is valid', () => {
      expect(objectid.isValid(objectid.MAX)).toBe(true)
    })

    it('NIL round-trips through bytes', () => {
      const bytes = objectid.toBytes(objectid.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(objectid.fromBytes(bytes)).toBe(objectid.NIL)
    })

    it('MAX round-trips through bytes', () => {
      const bytes = objectid.toBytes(objectid.MAX)
      expect(bytes.every((b) => b === 0xff)).toBe(true)
      expect(objectid.fromBytes(bytes)).toBe(objectid.MAX)
    })
  })
})
