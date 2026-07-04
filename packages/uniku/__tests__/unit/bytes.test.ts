import { incrementBytesInPlace, writeTimestamp32, writeTimestamp48 } from '@/src/common/bytes'

describe('byte utilities', () => {
  describe('incrementBytesInPlace', () => {
    it('increments the last byte without carry', () => {
      const bytes = new Uint8Array([0x00, 0x12, 0x34])

      expect(incrementBytesInPlace(bytes)).toBe(true)
      expect([...bytes]).toEqual([0x00, 0x12, 0x35])
    })

    it('propagates carry through trailing 0xff bytes', () => {
      const bytes = new Uint8Array([0x00, 0x12, 0xff, 0xff])

      expect(incrementBytesInPlace(bytes)).toBe(true)
      expect([...bytes]).toEqual([0x00, 0x13, 0x00, 0x00])
    })

    it('wraps to zero and returns false when all bytes overflow', () => {
      const bytes = new Uint8Array([0xff, 0xff, 0xff])

      expect(incrementBytesInPlace(bytes)).toBe(false)
      expect([...bytes]).toEqual([0x00, 0x00, 0x00])
    })
  })

  describe('timestamp writers', () => {
    it('writes 48-bit timestamps as big-endian bytes', () => {
      const timestamp = 0x123456789abc
      const actual = new Uint8Array(10)
      const expected = new Uint8Array(10)
      const expectedView = new DataView(expected.buffer)

      expectedView.setUint16(2, Math.floor(timestamp / 0x100000000), false)
      expectedView.setUint32(4, timestamp >>> 0, false)
      writeTimestamp48(actual, 2, timestamp)

      expect([...actual]).toEqual([...expected])
    })

    it('writes 32-bit timestamps as big-endian bytes', () => {
      const timestamp = 0x89abcdef
      const actual = new Uint8Array(8)
      const expected = new Uint8Array(8)

      new DataView(expected.buffer).setUint32(3, timestamp, false)
      writeTimestamp32(actual, 3, timestamp)

      expect([...actual]).toEqual([...expected])
    })
  })
})
