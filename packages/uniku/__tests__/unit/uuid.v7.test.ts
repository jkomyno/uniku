import { uuidv7 } from '../../src/uuid/v7'

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
})
