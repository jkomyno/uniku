import { cuidv2 } from '@/src/cuid/v2'
import { InvalidInputError } from '@/src/errors'
import { expectValidTypeGuard } from '../helpers/assertions'
import { expectDistinctRandomSamples } from '../helpers/randomness'

describe('cuidv2', () => {
  it('generates a valid CUID2 string', () => {
    const id = cuidv2()
    expect(id).toMatch(/^[a-z][0-9a-z]+$/)
    expect(id.length).toBe(24)
  })

  it('generates lowercase output', () => {
    const id = cuidv2()
    expect(id).toBe(id.toLowerCase())
  })

  it('always starts with a letter', () => {
    for (let i = 0; i < 1000; i += 1) {
      const id = cuidv2()
      expect(id[0]).toMatch(/[a-z]/)
    }
  })

  it('generates unique ids in small sample', () => {
    expectDistinctRandomSamples({
      count: 10_000,
      maxDuplicateCount: 0,
      generate: cuidv2,
    })
  })

  it('handles high-throughput generation (counter stress test)', { timeout: 30000 }, () => {
    expectDistinctRandomSamples({
      count: 50_000,
      maxDuplicateCount: 0,
      generate: cuidv2,
    })
  })

  it('supports custom length option', () => {
    expect(cuidv2({ length: 10 }).length).toBe(10)
    expect(cuidv2({ length: 32 }).length).toBe(32)
    expect(cuidv2({ length: 2 }).length).toBe(2)
  })

  it('throws on invalid length', () => {
    expect(() => cuidv2({ length: 1 })).toThrow(InvalidInputError)
    expect(() => cuidv2({ length: 33 })).toThrow(InvalidInputError)
    expect(() => cuidv2({ length: 0 })).toThrow(InvalidInputError)
    expect(() => cuidv2({ length: -1 })).toThrow(InvalidInputError)
  })

  it('supports custom random option for determinism', () => {
    const random = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    const id = cuidv2({ random })
    expect(cuidv2.isValid(id)).toBe(true)
  })

  it('throws on empty random array', () => {
    expect(() => cuidv2({ random: new Uint8Array(0) })).toThrow('Random byte array cannot be empty')
  })

  describe('isValid', () => {
    it('returns true for valid CUID2s', () => {
      expect(cuidv2.isValid(cuidv2())).toBe(true)
      expect(cuidv2.isValid('pfh0haxfpzowht3oi213cqos')).toBe(true)
      expect(cuidv2.isValid('ab')).toBe(true) // min length
      expect(cuidv2.isValid('a'.padEnd(32, 'b'))).toBe(true) // max length
    })

    it('returns true for custom length CUID2s', () => {
      const shortId = cuidv2({ length: 10 })
      expect(cuidv2.isValid(shortId)).toBe(true)
    })

    it('returns false for wrong first character', () => {
      expect(cuidv2.isValid('1lq8z9za5000x8zvs7oqe5ump')).toBe(false)
      expect(cuidv2.isValid('0abc')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(cuidv2.isValid('CLQ8Z9ZA5000X8ZVS7OQE5UMP')).toBe(false) // uppercase
      expect(cuidv2.isValid('clq8z9za-5000-x8zv-s7oq-e5ump')).toBe(false) // hyphens
      expect(cuidv2.isValid('clq8z9za_5000_x8zv')).toBe(false) // underscores
    })

    it('returns false for wrong length', () => {
      expect(cuidv2.isValid('a')).toBe(false) // too short (< 2)
      expect(cuidv2.isValid('')).toBe(false) // empty
      expect(cuidv2.isValid('a'.padEnd(33, 'b'))).toBe(false) // too long (> 32)
    })

    it('returns false for non-strings', () => {
      expect(cuidv2.isValid(null)).toBe(false)
      expect(cuidv2.isValid(undefined)).toBe(false)
      expect(cuidv2.isValid(123)).toBe(false)
      expect(cuidv2.isValid({})).toBe(false)
      expect(cuidv2.isValid([])).toBe(false)
    })

    it('acts as type guard for unknown values', () => {
      const maybeId: unknown = cuidv2()
      expectValidTypeGuard<string>(maybeId, cuidv2.isValid)
      expect(maybeId.length).toBeGreaterThan(0)
    })
  })
})
