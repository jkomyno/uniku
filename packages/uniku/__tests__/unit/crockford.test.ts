import { bytesToUlid, decodeTime, decodeToBytes, encodeRandom, encodeTime } from '../../src/ulid/common/crockford'

describe('crockford encoding', () => {
  describe('encodeTime', () => {
    it('encodes zero timestamp', () => {
      expect(encodeTime(0)).toBe('0000000000')
    })

    it('encodes known timestamp', () => {
      // 1469918176385 is a known test value from the ULID spec
      const encoded = encodeTime(1469918176385)
      expect(encoded.length).toBe(10)
      expect(encoded).toBe('01ARYZ6S41')
    })

    it('encodes max timestamp', () => {
      // Max 48-bit value: 2^48 - 1 = 281474976710655
      const encoded = encodeTime(281474976710655)
      expect(encoded).toBe('7ZZZZZZZZZ')
    })
  })

  describe('decodeTime', () => {
    it('decodes zero timestamp', () => {
      expect(decodeTime('0000000000')).toBe(0)
    })

    it('decodes known timestamp', () => {
      expect(decodeTime('01ARYZ6S41')).toBe(1469918176385)
    })

    it('decodes max timestamp', () => {
      expect(decodeTime('7ZZZZZZZZZ')).toBe(281474976710655)
    })

    it('is case insensitive', () => {
      expect(decodeTime('01aryz6s41')).toBe(1469918176385)
      expect(decodeTime('01ArYz6S41')).toBe(1469918176385)
    })

    it('throws on invalid characters', () => {
      expect(() => decodeTime('01ARYZ6S4I')).toThrow() // I is invalid
      expect(() => decodeTime('01ARYZ6S4L')).toThrow() // L is invalid
      expect(() => decodeTime('01ARYZ6S4O')).toThrow() // O is invalid
      expect(() => decodeTime('01ARYZ6S4U')).toThrow() // U is invalid
    })
  })

  describe('encodeRandom', () => {
    it('encodes all zeros', () => {
      const bytes = new Uint8Array(10)
      expect(encodeRandom(bytes)).toBe('0000000000000000')
    })

    it('encodes all ones (0xff)', () => {
      const bytes = new Uint8Array(10).fill(0xff)
      expect(encodeRandom(bytes)).toBe('ZZZZZZZZZZZZZZZZ')
    })

    it('produces 16-character output', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(encodeRandom(bytes).length).toBe(16)
    })
  })

  describe('decodeToBytes', () => {
    it('decodes a valid ULID to 16 bytes', () => {
      const bytes = decodeToBytes('01ARZ3NDEKTSV4RRFFQ69G5FAV')
      expect(bytes.length).toBe(16)
    })

    it('throws on wrong length', () => {
      expect(() => decodeToBytes('01ARZ3NDEKTSV4RRFFQ69G5FA')).toThrow()
      expect(() => decodeToBytes('01ARZ3NDEKTSV4RRFFQ69G5FAVX')).toThrow()
    })

    it('throws on invalid characters', () => {
      expect(() => decodeToBytes('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toThrow()
    })

    it('is case insensitive', () => {
      const upper = decodeToBytes('01ARZ3NDEKTSV4RRFFQ69G5FAV')
      const lower = decodeToBytes('01arz3ndektsv4rrffq69g5fav')
      expect(upper).toEqual(lower)
    })
  })

  describe('bytesToUlid', () => {
    it('encodes 16 bytes to 26-character string', () => {
      const bytes = new Uint8Array(16)
      const ulid = bytesToUlid(bytes)
      expect(ulid.length).toBe(26)
    })

    it('produces uppercase output', () => {
      const bytes = new Uint8Array(16).fill(0xff)
      const ulid = bytesToUlid(bytes)
      expect(ulid).toBe(ulid.toUpperCase())
    })

    it('throws on short byte array', () => {
      expect(() => bytesToUlid(new Uint8Array(15))).toThrow()
    })
  })

  describe('round-trip encoding', () => {
    it('encodeTime/decodeTime round-trips', () => {
      const timestamps = [0, 1, 1000, 1469918176385, 281474976710655]
      for (const ts of timestamps) {
        expect(decodeTime(encodeTime(ts))).toBe(ts)
      }
    })

    it('bytesToUlid/decodeToBytes round-trips', () => {
      for (let i = 0; i < 100; i += 1) {
        const bytes = new Uint8Array(16)
        globalThis.crypto.getRandomValues(bytes)
        // Ensure first byte doesn't cause overflow (must result in first char 0-7)
        bytes[0] = bytes[0] & 0x7f

        const ulid = bytesToUlid(bytes)
        const decoded = decodeToBytes(ulid)
        expect(decoded).toEqual(bytes)
      }
    })
  })
})
