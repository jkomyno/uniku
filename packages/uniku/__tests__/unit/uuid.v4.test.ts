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
})
