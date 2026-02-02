import { uuidv4 } from '../../src/uuid/v4'

describe('uuidv4', () => {
  it('generates a valid UUID v4 string', () => {
    const id = uuidv4()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id.length).toBe(36)
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
    const ids = new Set<string>()
    for (let i = 0; i < 100_000; i += 1) {
      ids.add(uuidv4())
    }
    expect(ids.size).toBe(100_000)
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
  })
})
