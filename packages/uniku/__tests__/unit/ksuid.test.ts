import { ksuid } from '@/src/ksuid/ksuid'

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return left[i] - right[i]
    }
  }
  return 0
}

describe('ksuid', () => {
  it('generates a valid KSUID string', () => {
    const id = ksuid()
    expect(id).toMatch(/^[0-9A-Za-z]{27}$/)
    expect(id.length).toBe(27)
  })

  it('generates unique ids in small sample', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 10_000; i += 1) {
      ids.add(ksuid())
    }
    expect(ids.size).toBe(10_000)
  })

  it('encodes the timestamp in the first 4 bytes', () => {
    const secs = 1_702_387_456 // Unix timestamp in seconds
    const expectedKsuidSecs = secs - 1400000000 // KSUID epoch

    const bytes = ksuid.toBytes(ksuid({ secs, random: new Uint8Array(16) }))

    const decoded = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

    expect(decoded).toBe(expectedKsuidSecs)
  })

  it('extracts timestamp correctly', () => {
    const secs = 1_702_387_456 // Unix timestamp in seconds
    const id = ksuid({ secs, random: new Uint8Array(16) })
    expect(ksuid.timestamp(id)).toBe(secs * 1000) // timestamp() returns milliseconds
  })

  it('increases lexicographically within the same second', () => {
    const secs = 1_702_387_456
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(secs * 1000)
    const samples = 1_000
    const ids = new Array<string>(samples)

    for (let i = 0; i < samples; i += 1) {
      ids[i] = ksuid()
    }
    nowSpy.mockRestore()

    for (let i = 0; i < samples - 1; i += 1) {
      // KSUIDs should sort lexicographically
      expect(ids[i] < ids[i + 1]).toBe(true)
    }
  })

  it('increases bytes within the same second', () => {
    const secs = 1_702_387_456
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(secs * 1000)
    const samples = 1_000
    const bytesList = new Array<Uint8Array>(samples)

    for (let i = 0; i < samples; i += 1) {
      bytesList[i] = ksuid.toBytes(ksuid())
    }
    nowSpy.mockRestore()

    for (let i = 0; i < samples - 1; i += 1) {
      expect(compareBytes(bytesList[i], bytesList[i + 1])).toBeLessThan(0)
    }
  })

  it('round-trips through byte helpers', () => {
    const id = ksuid()
    expect(ksuid.fromBytes(ksuid.toBytes(id))).toBe(id)
  })

  it('round-trips through toBytes and fromBytes', () => {
    // Generate a KSUID and verify toBytes -> fromBytes produces the same string
    const id = ksuid()
    const bytes = ksuid.toBytes(id)
    const recovered = ksuid.fromBytes(bytes)
    expect(recovered).toBe(id)
  })

  it('supports custom timestamp option', () => {
    const secs = 1_500_000_000
    const id = ksuid({ secs })
    expect(ksuid.timestamp(id)).toBe(secs * 1000) // timestamp() returns milliseconds
  })

  it('supports custom random option', () => {
    const random = new Uint8Array(16).fill(42)
    const id1 = ksuid({ secs: 1_500_000_000, random })
    const id2 = ksuid({ secs: 1_500_000_000, random })
    expect(id1).toBe(id2)
  })

  it('supports buffer output', () => {
    const buffer = new Uint8Array(32)
    const offset = 8

    const result = ksuid({ secs: 1_702_387_456, random: new Uint8Array(16) }, buffer, offset)
    expect(result).toBe(buffer)

    const fromString = ksuid.toBytes(ksuid({ secs: 1_702_387_456, random: new Uint8Array(16) }))
    for (let i = 0; i < fromString.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromString[i])
    }
  })

  it('throws on buffer bounds error', () => {
    const buffer = new Uint8Array(10)
    expect(() => ksuid({}, buffer, 0)).toThrow(RangeError)
  })

  describe('isValid', () => {
    it('returns true for valid KSUIDs', () => {
      expect(ksuid.isValid(ksuid())).toBe(true)
      // Known valid KSUID examples from Segment
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1K')).toBe(true)
      expect(ksuid.isValid('0ujtsYcgvSTl8PAuAdqWYSMnLOv')).toBe(true)
    })

    it('validates format correctly (27 alphanumeric chars)', () => {
      // Base62 allows any mix of 0-9, A-Z, a-z
      expect(ksuid.isValid('000000000000000000000000000')).toBe(true) // all zeros
      expect(ksuid.isValid('ZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(true) // all uppercase Z
      expect(ksuid.isValid('zzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(true) // all lowercase z
    })

    it('returns false for wrong length', () => {
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1')).toBe(false) // 26 chars
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1KX')).toBe(false) // 28 chars
      expect(ksuid.isValid('')).toBe(false)
    })

    it('returns false for invalid characters', () => {
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf-tY1K')).toBe(false) // hyphen
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf_tY1K')).toBe(false) // underscore
      expect(ksuid.isValid('0ujsswThIGTUYm2K8FjOOf+tY1K')).toBe(false) // plus
    })

    it('returns false for non-strings', () => {
      expect(ksuid.isValid(123 as unknown as string)).toBe(false)
      expect(ksuid.isValid(null as unknown as string)).toBe(false)
      expect(ksuid.isValid(undefined as unknown as string)).toBe(false)
    })
  })

  describe('timestamp edge cases', () => {
    it('handles KSUID epoch boundary', () => {
      // KSUID epoch: May 13, 2014 (1400000000 seconds since Unix epoch)
      const epochSecs = 1400000000
      const id = ksuid({ secs: epochSecs, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(epochSecs * 1000) // timestamp() returns milliseconds
      // First 4 bytes should be 0 at the epoch
      const bytes = ksuid.toBytes(id)
      expect(bytes[0]).toBe(0)
      expect(bytes[1]).toBe(0)
      expect(bytes[2]).toBe(0)
      expect(bytes[3]).toBe(0)
    })

    it('handles timestamp well after epoch', () => {
      // A timestamp well into the future from KSUID epoch
      const secs = 2000000000 // ~2033
      const id = ksuid({ secs, random: new Uint8Array(16) })
      expect(ksuid.timestamp(id)).toBe(secs * 1000) // timestamp() returns milliseconds
    })
  })

  describe('Base62 encoding edge cases', () => {
    it('encodes minimum KSUID (all zeros)', () => {
      const bytes = new Uint8Array(20).fill(0)
      const encoded = ksuid.fromBytes(bytes)
      expect(encoded).toBe('000000000000000000000000000')
      expect(encoded.length).toBe(27)
    })

    it('decodes minimum KSUID', () => {
      const decoded = ksuid.toBytes('000000000000000000000000000')
      expect(decoded.every((b) => b === 0)).toBe(true)
    })

    it('round-trips various byte patterns', () => {
      // All 0xFF
      const maxBytes = new Uint8Array(20).fill(0xff)
      expect(compareBytes(ksuid.toBytes(ksuid.fromBytes(maxBytes)), maxBytes)).toBe(0)

      // Alternating pattern
      const altBytes = new Uint8Array(20)
      for (let i = 0; i < 20; i += 1) {
        altBytes[i] = i % 2 === 0 ? 0xaa : 0x55
      }
      expect(compareBytes(ksuid.toBytes(ksuid.fromBytes(altBytes)), altBytes)).toBe(0)
    })
  })
})
