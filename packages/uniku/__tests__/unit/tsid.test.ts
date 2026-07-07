import { afterEach } from 'vitest'
import { BufferError, InvalidInputError, ParseError, tsid } from '@/src/tsid/tsid'
import { expectValidTypeGuard } from '../helpers/assertions'

const TSID_EPOCH = 1_577_836_800_000 // 2020-01-01T00:00:00.000Z
const DEFAULT_NODE_MAX = 1023 // 2^10 - 1
const DEFAULT_COUNTER_MAX = 4095 // 2^12 - 1
const MAX_TIMESTAMP_DIFF = 2n ** 42n - 1n

async function importFreshTsidModule() {
  vi.resetModules()
  return import('@/src/tsid/tsid')
}

describe('tsid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a bigint in [0n, 2n**64n)', () => {
    const id = tsid()
    expect(typeof id).toBe('bigint')
    expect(id >= 0n).toBe(true)
    expect(id < 2n ** 64n).toBe(true)
  })

  it('toString matches the canonical pattern and round-trips via fromString', () => {
    const id = tsid()
    const str = tsid.toString(id)
    expect(str).toMatch(/^[0-9A-Fa-f][0-9A-HJKMNP-TV-Z]{12}$/i)
    expect(str.length).toBe(13)
    expect(tsid.fromString(str)).toBe(id)
  })

  it('two consecutive no-option calls: the second is numerically greater than the first', async () => {
    const { tsid: freshTsid } = await importFreshTsidModule()

    const first = freshTsid()
    const second = freshTsid()

    expect(second > first).toBe(true)
  })

  it('embeds the given timestamp exactly', () => {
    const msecs = 1_700_000_000_000
    const epoch = 1_600_000_000_000
    const id = tsid({ msecs, epoch, node: 1, counter: 1 })
    expect(tsid.timestamp(id, epoch)).toBe(msecs)
  })

  it('uses the default TSID epoch when none is provided', () => {
    const msecs = TSID_EPOCH + 123_456
    const id = tsid({ msecs, node: 0, counter: 0 })
    expect(tsid.timestamp(id)).toBe(msecs)
  })

  it('produces a specific hand-computed packed value (test vector)', () => {
    // Hand-computed per the bit layout documented in tsid.ts:
    // (BigInt(msecs - epoch) << 22n) | (BigInt(node) << BigInt(22 - nodeBits)) | BigInt(counter)
    const epoch = 1_600_000_000_000
    const msecs = 1_600_000_100_000 // diff = 100_000ms
    const node = 5
    const nodeBits = 10
    const counter = 7

    const diff = BigInt(msecs - epoch)
    const expected = (diff << 22n) | (BigInt(node) << BigInt(22 - nodeBits)) | BigInt(counter)
    expect(expected).toBe(419_430_420_487n)

    const id = tsid({ msecs, epoch, node, nodeBits, counter })
    expect(id).toBe(expected)
  })

  it('supports buffer output at a given offset', () => {
    const buffer = new Uint8Array(32)
    const offset = 8
    const options = { msecs: 1_700_000_000_000, epoch: TSID_EPOCH, node: 3, counter: 9 }

    const result = tsid(options, buffer, offset)
    expect(result).toBe(buffer)

    const fromNoBuffer = tsid.toBytes(tsid(options))
    for (let i = 0; i < fromNoBuffer.length; i += 1) {
      expect(buffer[offset + i]).toBe(fromNoBuffer[i])
    }
  })

  describe('boundary values', () => {
    it('round-trips node and counter at 0 and max for the default 10/12 bit split', () => {
      for (const node of [0, DEFAULT_NODE_MAX]) {
        for (const counter of [0, DEFAULT_COUNTER_MAX]) {
          const id = tsid({ msecs: 1_700_000_000_000, node, counter })
          expect(tsid.fromBytes(tsid.toBytes(id))).toBe(id)
          expect(tsid.fromString(tsid.toString(id))).toBe(id)
        }
      }
    })

    it('nodeBits = 0 allocates all 22 random bits to the counter', () => {
      const counterMax = 2 ** 22 - 1
      const id = tsid({ msecs: 1_700_000_000_000, nodeBits: 0, node: 0, counter: counterMax })
      expect(id & ((1n << 22n) - 1n)).toBe(BigInt(counterMax))
    })

    it('nodeBits = 20 allocates a 20-bit node and a 2-bit counter', () => {
      const nodeMax = 2 ** 20 - 1
      const counterMax = 2 ** 2 - 1
      const id = tsid({ msecs: 1_700_000_000_000, nodeBits: 20, node: nodeMax, counter: counterMax })

      expect(id & 0x3n).toBe(BigInt(counterMax))
      expect((id >> 2n) & BigInt(nodeMax)).toBe(BigInt(nodeMax))
    })
  })

  describe('counter overflow within a simulated single millisecond', () => {
    it('advances the internal virtual timestamp and resets the counter, staying strictly increasing', async () => {
      const { tsid: freshTsid } = await importFreshTsidModule()
      const ms = 1_700_000_000_000
      vi.spyOn(Date, 'now').mockReturnValue(ms)

      // Comfortably exceeds the default 12-bit counter width (4096 values/ms)
      // regardless of the random initial counter offset.
      const samples = 5_000
      const ids = new Array<bigint>(samples)
      for (let i = 0; i < samples; i += 1) {
        ids[i] = freshTsid()
      }

      for (let i = 0; i < samples - 1; i += 1) {
        expect(ids[i] < ids[i + 1]).toBe(true)
      }

      // The virtual timestamp must have advanced past the frozen wall clock
      // at least once to accommodate more than 4096 IDs in "the same" millisecond.
      const lastTimestamp = freshTsid.timestamp(ids[samples - 1])
      expect(lastTimestamp).toBeGreaterThan(ms)
    })
  })

  describe('error paths', () => {
    it('throws InvalidInputError when nodeBits is outside [0, 20]', () => {
      expect(() => tsid({ nodeBits: -1 })).toThrow(InvalidInputError)
      expect(() => tsid({ nodeBits: 21 })).toThrow(InvalidInputError)
    })

    it('throws InvalidInputError when node is outside [0, 2^nodeBits)', () => {
      expect(() => tsid({ node: -1 })).toThrow(InvalidInputError)
      expect(() => tsid({ node: DEFAULT_NODE_MAX + 1 })).toThrow(InvalidInputError)
      expect(() => tsid({ nodeBits: 0, node: 1 })).toThrow(InvalidInputError)
    })

    it('throws InvalidInputError when counter is outside [0, 2^(22-nodeBits))', () => {
      expect(() => tsid({ counter: -1 })).toThrow(InvalidInputError)
      expect(() => tsid({ counter: DEFAULT_COUNTER_MAX + 1 })).toThrow(InvalidInputError)
    })

    it('throws InvalidInputError when (msecs - epoch) is outside [0, 2^42)', () => {
      // Negative diff: msecs before the epoch.
      expect(() => tsid({ msecs: 0, epoch: 1000 })).toThrow(InvalidInputError)
      // Diff exactly at 2^42 (one past the maximum valid diff).
      const epoch = 0
      const msecs = Number(2n ** 42n)
      expect(() => tsid({ msecs, epoch })).toThrow(InvalidInputError)
    })

    it('accepts the maximum valid (msecs - epoch) diff at exactly 2^42 - 1', () => {
      const epoch = 0
      const msecs = Number(MAX_TIMESTAMP_DIFF)
      expect(() => tsid({ msecs, epoch, node: 0, counter: 0 })).not.toThrow()
      expect(tsid.timestamp(tsid({ msecs, epoch, node: 0, counter: 0 }), epoch)).toBe(msecs)
    })

    it('throws BufferError when the buffer is too small for the offset', () => {
      const buffer = new Uint8Array(10)
      expect(() => tsid({}, buffer, 5)).toThrow(BufferError)
    })

    it('throws ParseError from fromString for the wrong length', () => {
      expect(() => tsid.fromString('0'.repeat(12))).toThrow(ParseError)
      expect(() => tsid.fromString('0'.repeat(14))).toThrow(ParseError)
      expect(() => tsid.fromString('')).toThrow(ParseError)
    })

    it('throws ParseError from fromString for a non-Crockford character', () => {
      expect(() => tsid.fromString(`0${'I'}${'0'.repeat(11)}`)).toThrow(ParseError) // I is excluded
      expect(() => tsid.fromString(`0${'L'}${'0'.repeat(11)}`)).toThrow(ParseError) // L is excluded
      expect(() => tsid.fromString(`0${'O'}${'0'.repeat(11)}`)).toThrow(ParseError) // O is excluded
      expect(() => tsid.fromString(`0${'U'}${'0'.repeat(11)}`)).toThrow(ParseError) // U is excluded
      expect(() => tsid.fromString(`0${'u'}${'0'.repeat(11)}`)).toThrow(ParseError) // u is excluded
      expect(() => tsid.fromString(`€${'0'.repeat(12)}`)).toThrow(ParseError)
    })

    it('throws ParseError from fromString for a leading character outside 0-9A-Fa-f', () => {
      for (const leading of ['G', 'H', 'Z', 'g', 'z']) {
        expect(() => tsid.fromString(`${leading}${'0'.repeat(12)}`)).toThrow(ParseError)
      }
    })

    it('accepts a leading character within 0-9A-Fa-f (case-insensitive)', () => {
      for (const leading of ['0', '9', 'A', 'F', 'a', 'f']) {
        expect(() => tsid.fromString(`${leading}${'0'.repeat(12)}`)).not.toThrow()
      }
    })

    it('throws BufferError from fromBytes for a byte array of length != 8', () => {
      expect(() => tsid.fromBytes(new Uint8Array(7))).toThrow(BufferError)
      expect(() => tsid.fromBytes(new Uint8Array(9))).toThrow(BufferError)
      expect(() => tsid.fromBytes(new Uint8Array(0))).toThrow(BufferError)
    })
  })

  describe('round-trips', () => {
    it('round-trips through byte helpers for a hot-path generated id', () => {
      const id = tsid()
      expect(tsid.fromBytes(tsid.toBytes(id))).toBe(id)
    })

    it('round-trips through byte helpers for a deterministic-path generated id', () => {
      const id = tsid({ msecs: 1_700_000_000_000, node: 42, counter: 123 })
      expect(tsid.fromBytes(tsid.toBytes(id))).toBe(id)
    })

    it('round-trips through string helpers for a hot-path generated id', () => {
      const id = tsid()
      expect(tsid.fromString(tsid.toString(id))).toBe(id)
    })

    it('round-trips through string helpers for a deterministic-path generated id', () => {
      const id = tsid({ msecs: 1_700_000_000_000, node: 42, counter: 123 })
      expect(tsid.fromString(tsid.toString(id))).toBe(id)
    })
  })

  describe('isValid', () => {
    it('accepts a generated ID', () => {
      expect(tsid.isValid(tsid())).toBe(true)
    })

    it('rejects negative bigints', () => {
      expect(tsid.isValid(-1n)).toBe(false)
    })

    it('rejects values greater than MAX', () => {
      expect(tsid.isValid(tsid.MAX + 1n)).toBe(false)
    })

    it('rejects non-bigint input', () => {
      expect(tsid.isValid('0000000000000')).toBe(false)
      expect(tsid.isValid(123)).toBe(false)
      expect(tsid.isValid(undefined)).toBe(false)
      expect(tsid.isValid(null)).toBe(false)
      expect(tsid.isValid({})).toBe(false)
    })

    it('acts as a type guard', () => {
      const maybeId: unknown = tsid()
      expectValidTypeGuard<bigint>(maybeId, tsid.isValid)
      expect(typeof maybeId).toBe('bigint')
    })
  })

  describe('NIL and MAX constants', () => {
    it('has correct NIL constant', () => {
      expect(tsid.NIL).toBe(0n)
      expect(tsid.toString(tsid.NIL)).toBe('0000000000000')
    })

    it('has correct MAX constant', () => {
      expect(tsid.MAX).toBe(2n ** 64n - 1n)
      expect(tsid.toString(tsid.MAX)).toBe('FZZZZZZZZZZZZ')
    })

    it('NIL is valid', () => {
      expect(tsid.isValid(tsid.NIL)).toBe(true)
    })

    it('MAX is valid', () => {
      expect(tsid.isValid(tsid.MAX)).toBe(true)
    })

    it('NIL round-trips through bytes and string', () => {
      const bytes = tsid.toBytes(tsid.NIL)
      expect(bytes.every((b) => b === 0)).toBe(true)
      expect(tsid.fromBytes(bytes)).toBe(tsid.NIL)
      expect(tsid.fromString(tsid.toString(tsid.NIL))).toBe(tsid.NIL)
    })

    it('MAX round-trips through bytes and string', () => {
      const bytes = tsid.toBytes(tsid.MAX)
      expect(bytes.every((b) => b === 0xff)).toBe(true)
      expect(tsid.fromBytes(bytes)).toBe(tsid.MAX)
      expect(tsid.fromString(tsid.toString(tsid.MAX))).toBe(tsid.MAX)
    })
  })
})
