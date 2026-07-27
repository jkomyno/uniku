import { BufferError, InvalidInputError, typeid } from '@/src/typeid/typeid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'
import { expectValidTypeGuard } from '../helpers/assertions'

const FIXED_MSECS = 1_702_387_456_789
const ZERO_RANDOM = new Uint8Array(16)
const FIXED_UUID = '0188bac7-4afa-78aa-bc3b-bd1eef28d881'
const FIXED_TYPEID = 'prefix_01h2xcejqtf2nbrexx3vqjhp41'

describe('typeid', () => {
  it('generates a valid prefixed TypeID string', () => {
    const id = typeid('user')

    expect(id).toMatch(/^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
    expect(id.length).toBe('user_'.length + 26)
    expect(typeid.isValid(id)).toBe(true)
  })

  it('wraps UUID v7 using the TypeID base32 suffix', () => {
    const uuid = uuidv7({ msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })
    const id = typeid('user', { msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })

    expect(typeid.toUuid(id)).toBe(uuid)
    expect(typeid.fromUuid('user', uuid)).toBe(id)
    expect(typeid.fromBytes('user', uuidv7.toBytes(uuid))).toBe(id)
  })

  it('matches Jetify TypeID UUID conversion vectors', () => {
    expect(typeid.toUuid(FIXED_TYPEID)).toBe(FIXED_UUID)
    expect(typeid.fromUuid('prefix', FIXED_UUID)).toBe(FIXED_TYPEID)
  })

  it('round-trips through byte helpers', () => {
    const id = typeid('api_key', { msecs: FIXED_MSECS, counter: 0x12345678, random: ZERO_RANDOM })

    expect(typeid.fromBytes('api_key', typeid.toBytes(id))).toBe(id)
  })

  it('extracts timestamp from the wrapped UUID v7', () => {
    const id = typeid('user', { msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })

    expect(typeid.timestamp(id)).toBe(FIXED_MSECS)
  })

  it('extracts prefix and suffix', () => {
    const id = typeid('api_key', { msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })

    expect(typeid.prefix(id)).toBe('api_key')
    expect(typeid.suffix(id)).toHaveLength(26)
  })

  it('supports canonical empty-prefix TypeIDs', () => {
    const uuid = uuidv7({ msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })
    const id = typeid('', { msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM })

    expect(id).toMatch(/^[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/)
    expect(typeid.isValid(id)).toBe(true)
    expect(typeid.prefix(id)).toBe('')
    expect(typeid.suffix(id)).toBe(id)
    expect(typeid.toUuid(id)).toBe(uuid)
    expect(typeid.timestamp(id)).toBe(FIXED_MSECS)
    expect(typeid.fromUuid('', uuid)).toBe(id)
    expect(typeid.fromBytes('', uuidv7.toBytes(uuid))).toBe(id)
  })

  it('preserves lexicographic ordering within one prefix', () => {
    const first = typeid('user', { msecs: FIXED_MSECS, counter: 1, random: ZERO_RANDOM })
    const second = typeid('user', { msecs: FIXED_MSECS, counter: 2, random: ZERO_RANDOM })

    expect(first < second).toBe(true)
  })

  describe('buffer output', () => {
    it('writes the canonical UUID v7 bytes into a caller-owned buffer', () => {
      const buffer = new Uint8Array(32)
      const offset = 8
      const options = { msecs: FIXED_MSECS, counter: 0x12345678, random: ZERO_RANDOM }

      const result = typeid('user', options, buffer, offset)
      expect(result).toBe(buffer)

      const fromString = typeid.toBytes(typeid('user', options))
      for (let i = 0; i < fromString.length; i += 1) {
        expect(buffer[offset + i]).toBe(fromString[i])
      }
    })

    it('matches the bytes uuidv7 writes for the same options', () => {
      const typeidBuffer = new Uint8Array(16)
      const uuidBuffer = new Uint8Array(16)
      const options = { msecs: FIXED_MSECS, counter: 3, random: ZERO_RANDOM }

      typeid('user', options, typeidBuffer)
      uuidv7(options, uuidBuffer)

      expect(typeidBuffer).toEqual(uuidBuffer)
    })

    it('attributes buffer bounds failures to the typeid boundary', () => {
      let error: unknown
      try {
        typeid('user', { msecs: FIXED_MSECS, counter: 0, random: ZERO_RANDOM }, new Uint8Array(10))
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(BufferError)
      expect(error).toMatchObject({ code: 'BUFFER_OUT_OF_BOUNDS', strategy: 'typeid' })
    })

    it('validates the prefix in buffer mode', () => {
      expect(() => typeid('User', undefined, new Uint8Array(16))).toThrow(
        'TypeID prefix must contain only lowercase ASCII letters and underscores',
      )
    })
  })

  describe('option boundary attribution', () => {
    it('attributes counter range failures to the typeid boundary', () => {
      let error: unknown
      try {
        typeid('user', { counter: -1 })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'COUNTER_OUT_OF_RANGE', strategy: 'typeid' })
    })

    it('attributes random-bytes failures to the typeid boundary', () => {
      let error: unknown
      try {
        typeid('user', { random: new Uint8Array(15) })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'RANDOM_BYTES_TOO_SHORT', strategy: 'typeid' })
    })
  })

  describe('deprecated seq alias', () => {
    // TODO(v1-rc): remove this block together with the `seq` option.
    it('produces the same output as counter until v1-rc', () => {
      const bySeq = typeid('user', { msecs: FIXED_MSECS, seq: 0x12345678, random: ZERO_RANDOM })
      const byCounter = typeid('user', { msecs: FIXED_MSECS, counter: 0x12345678, random: ZERO_RANDOM })
      expect(bySeq).toBe(byCounter)
    })

    it('rejects passing both counter and seq', () => {
      let error: unknown
      try {
        typeid('user', { counter: 1, seq: 1 })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'CONFLICTING_OPTIONS', strategy: 'typeid' })
    })
  })

  describe('prefix validation', () => {
    it('accepts lowercase snake_case prefixes', () => {
      expect(typeid.isValid(typeid('api_key'))).toBe(true)
      expect(typeid.isValid(typeid('a'))).toBe(true)
    })

    it('rejects invalid prefixes', () => {
      const validSuffix = typeid.suffix(typeid('user'))

      expect(() => typeid('_user')).toThrow('TypeID prefix must start and end with a-z')
      expect(() => typeid('user_')).toThrow('TypeID prefix must start and end with a-z')
      expect(() => typeid('User')).toThrow('TypeID prefix must contain only lowercase ASCII letters and underscores')
      expect(() => typeid('user1')).toThrow('TypeID prefix must contain only lowercase ASCII letters and underscores')
      expect(() => typeid('a'.repeat(64))).toThrow('TypeID prefix must be at most 63 characters')
      expect(typeid.isValid(`User_${validSuffix}`)).toBe(false)
      expect(typeid.isValid(`_${validSuffix}`)).toBe(false)
    })
  })

  describe('conversion validation', () => {
    it('rejects invalid UUID strings', () => {
      expect(() => typeid.fromUuid('user', 'not-a-uuid')).toThrow('TypeID can only wrap UUID v7 values')
    })

    it('rejects invalid byte lengths', () => {
      expect(() => typeid.fromBytes('user', new Uint8Array(15))).toThrow('UUID bytes must be 16 bytes, got 15')
    })

    it('rejects non-v7 UUID bytes', () => {
      expect(() => typeid.fromBytes('user', uuidv4.toBytes(uuidv4()))).toThrow(
        'TypeID UUID bytes must encode a UUID v7 value',
      )
    })
  })

  describe('isValid', () => {
    it('returns true for valid TypeIDs', () => {
      expect(typeid.isValid(typeid('user'))).toBe(true)
      expect(typeid.isValid(FIXED_TYPEID)).toBe(true)
    })

    it('returns false for invalid strings', () => {
      const id = typeid('user')
      const suffix = typeid.suffix(id)

      expect(typeid.isValid(`user-${suffix}`)).toBe(false)
      expect(typeid.isValid(`user_${suffix.slice(1)}`)).toBe(false)
      expect(typeid.isValid(`user_${suffix.toUpperCase()}`)).toBe(false)
      expect(typeid.isValid(`user_8${suffix.slice(1)}`)).toBe(false)
      expect(typeid.isValid(`user_${'0'.repeat(14)}4${'0'.repeat(11)}`)).toBe(false)
      expect(typeid.isValid('')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(typeid.isValid(null)).toBe(false)
      expect(typeid.isValid(undefined)).toBe(false)
      expect(typeid.isValid(123)).toBe(false)
      expect(typeid.isValid({})).toBe(false)
      expect(typeid.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = typeid('user')
      expectValidTypeGuard<string>(maybeId, typeid.isValid)
      expect(maybeId.startsWith('user_')).toBe(true)
    })
  })
})
