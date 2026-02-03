import { nanoid, URL_ALPHABET } from '../../src/nanoid/nanoid'

describe('nanoid', () => {
  it('generates a 21-character string by default', () => {
    const id = nanoid()
    expect(id).toHaveLength(21)
  })

  it('generates URL-safe characters only', () => {
    const id = nanoid()
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates custom size with number argument', () => {
    expect(nanoid(10)).toHaveLength(10)
    expect(nanoid(50)).toHaveLength(50)
  })

  it('generates custom size with options', () => {
    expect(nanoid({ size: 10 })).toHaveLength(10)
  })

  it('generates with custom alphabet', () => {
    const id = nanoid({ alphabet: '0123456789abcdef', size: 12 })
    expect(id).toHaveLength(12)
    expect(id).toMatch(/^[0-9a-f]+$/)
  })

  it('generates deterministic output with random option', () => {
    const random = new Uint8Array(128).fill(42)
    const id1 = nanoid({ random: new Uint8Array(random) })
    const id2 = nanoid({ random: new Uint8Array(random) })
    expect(id1).toBe(id2)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100_000 }, () => nanoid()))
    expect(ids.size).toBe(100_000)
  })

  it('generates unique IDs under parallel generation', async () => {
    const promises = Array.from({ length: 1000 }, () => Promise.resolve(nanoid()))
    const ids = await Promise.all(promises)
    expect(new Set(ids).size).toBe(1000)
  })

  it('handles high-throughput generation', { timeout: 30000 }, () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50_000; i++) {
      ids.add(nanoid())
    }
    expect(ids.size).toBe(50_000)
  })

  it('exports URL_ALPHABET constant', () => {
    expect(URL_ALPHABET).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-')
    expect(URL_ALPHABET).toHaveLength(64)
  })

  describe('isValid', () => {
    it('returns true for valid nanoid strings', () => {
      expect(nanoid.isValid(nanoid())).toBe(true)
      expect(nanoid.isValid('V1StGXR8_Z5jdHi6B-myT')).toBe(true)
      expect(nanoid.isValid('abc')).toBe(true)
    })

    it('returns false for invalid inputs', () => {
      expect(nanoid.isValid('')).toBe(false)
      expect(nanoid.isValid('invalid!@#')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(nanoid.isValid(null)).toBe(false)
      expect(nanoid.isValid(undefined)).toBe(false)
      expect(nanoid.isValid(123)).toBe(false)
      expect(nanoid.isValid({})).toBe(false)
      expect(nanoid.isValid([])).toBe(false)
    })

    it('acts as type guard', () => {
      const maybeId: unknown = nanoid()
      if (nanoid.isValid(maybeId)) {
        // TypeScript should know maybeId is string here
        expect(maybeId.length).toBe(21)
      }
    })
  })

  describe('edge cases', () => {
    it('handles size 0', () => {
      expect(nanoid(0)).toBe('')
    })

    it('handles size 1', () => {
      const id = nanoid(1)
      expect(id).toHaveLength(1)
      expect(id).toMatch(/^[A-Za-z0-9_-]$/)
    })

    it('handles large sizes', () => {
      const id = nanoid(1000)
      expect(id).toHaveLength(1000)
    })

    it('throws for negative size', () => {
      expect(() => nanoid(-1)).toThrow(RangeError)
    })

    it('throws for non-integer size', () => {
      expect(() => nanoid(3.5)).toThrow(RangeError)
    })

    it('throws for size exceeding MAX_SIZE', () => {
      expect(() => nanoid(3000)).toThrow(RangeError)
    })

    it('throws for invalid alphabet', () => {
      expect(() => nanoid({ alphabet: '' })).toThrow()
      expect(() => nanoid({ alphabet: 'a' })).toThrow()
      expect(() => nanoid({ alphabet: 'aab' })).toThrow() // duplicates
    })

    it('throws for non-printable ASCII in alphabet', () => {
      expect(() => nanoid({ alphabet: 'ab\x00c' })).toThrow() // null char
      expect(() => nanoid({ alphabet: 'ab\x1Fc' })).toThrow() // control char
    })

    it('throws for insufficient random bytes', () => {
      expect(() => nanoid({ random: new Uint8Array(5) })).toThrow(/Insufficient/)
    })
  })
})
