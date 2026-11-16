import { afterEach } from 'vitest'
import { uuidv4 } from '@/src/uuid/v4'
import { expectValidTypeGuard } from '../helpers/assertions'
import { expectDistinctRandomSamples } from '../helpers/randomness'

describe('uuidv4', () => {
  it('generates a valid UUID v4 string', () => {
    const id = uuidv4()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id.length).toBe(36)
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(uuidv4.NIL).toBe('00000000-0000-0000-0000-000000000000')
      expect(uuidv4.NIL.length).toBe(36)
    })

    it('has correct MAX constant', () => {
      expect(uuidv4.MAX).toBe('ffffffff-ffff-ffff-ffff-ffffffffffff')
      expect(uuidv4.MAX.length).toBe(36)
    })

    it('NIL round-trips through bytes', () => {
      const bytes = uuidv4.toBytes(uuidv4.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(uuidv4.fromBytes(bytes)).toBe(uuidv4.NIL)
    })

    it('MAX round-trips through bytes', () => {
      const bytes = uuidv4.toBytes(uuidv4.MAX)
      expect(bytes.every((b) => b === 0xff)).toBe(true)
      expect(uuidv4.fromBytes(bytes)).toBe(uuidv4.MAX)
    })
  })

  it('sets version and variant bits', () => {
    const bytes = uuidv4.toBytes(uuidv4())
    expect(bytes[6] >> 4).toBe(4)
    expect((bytes[8] & 0xc0) === 0x80).toBe(true)
  })

  it('round-trips through byte helpers', () => {
    const id = uuidv4()
    expect(uuidv4.fromBytes(uuidv4.toBytes(id))).toBe(id.toLowerCase())
  })

  it('generates unique ids in small sample', () => {
    expectDistinctRandomSamples({
      count: 100_000,
      randomBits: 122,
      generate: uuidv4,
    })
  })

  describe('isValid', () => {
    it('returns true for valid UUID v4 strings', () => {
      expect(uuidv4.isValid(uuidv4())).toBe(true)
      expect(uuidv4.isValid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
      expect(uuidv4.isValid('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true)
    })

    it('returns true for 1,000 generated ids', () => {
      for (let i = 0; i < 1_000; i += 1) {
        expect(uuidv4.isValid(uuidv4())).toBe(true)
      }
    })

    it('returns false for wrong length or format', () => {
      expect(uuidv4.isValid('f47ac10b-58cc-4372-a567-0e02b2c3d47')).toBe(false)
      expect(uuidv4.isValid('f47ac10b58cc4372a5670e02b2c3d479')).toBe(false)
      expect(uuidv4.isValid('')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(uuidv4.isValid('g47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false)
    })

    it('returns false for wrong version or variant', () => {
      expect(uuidv4.isValid('f47ac10b-58cc-5372-a567-0e02b2c3d479')).toBe(false)
      expect(uuidv4.isValid('f47ac10b-58cc-4372-7567-0e02b2c3d479')).toBe(false)
      expect(uuidv4.isValid('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(uuidv4.isValid(null)).toBe(false)
      expect(uuidv4.isValid(undefined)).toBe(false)
      expect(uuidv4.isValid(123)).toBe(false)
      expect(uuidv4.isValid({})).toBe(false)
      expect(uuidv4.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = uuidv4()
      expectValidTypeGuard<string>(maybeId, uuidv4.isValid)
      expect(maybeId.length).toBe(36)
    })
  })

  // `Crypto.randomUUID` is secure-context-only, so an insecure browser origin exposes `crypto`
  // without it. The entry point must still import and generate there.
  describe('without crypto.randomUUID (insecure origin)', () => {
    const V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    async function importWithoutRandomUUID() {
      const realCrypto = globalThis.crypto
      vi.stubGlobal('crypto', { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) })
      vi.resetModules()
      return import('@/src/uuid/v4')
    }

    it('imports and generates a v4 string', async () => {
      const { uuidv4: insecureUuidv4 } = await importWithoutRandomUUID()

      const id = insecureUuidv4()

      expect(id).toMatch(V4_PATTERN)
      expect(insecureUuidv4.isValid(id)).toBe(true)
    })

    it('keeps the version and variant bits correct', async () => {
      const { uuidv4: insecureUuidv4 } = await importWithoutRandomUUID()

      const bytes = insecureUuidv4.toBytes(insecureUuidv4())

      expect(bytes[6] >> 4).toBe(4)
      expect((bytes[8] & 0xc0) === 0x80).toBe(true)
    })

    it('generates distinct ids instead of reusing the fallback buffer', async () => {
      const { uuidv4: insecureUuidv4 } = await importWithoutRandomUUID()

      const ids = new Set(Array.from({ length: 1_000 }, () => insecureUuidv4()))

      expect(ids.size).toBe(1_000)
    })

    it('still exposes the byte helpers', async () => {
      const { uuidv4: insecureUuidv4 } = await importWithoutRandomUUID()

      expect(insecureUuidv4.fromBytes(insecureUuidv4.toBytes(insecureUuidv4.NIL))).toBe(insecureUuidv4.NIL)
    })
  })
})
