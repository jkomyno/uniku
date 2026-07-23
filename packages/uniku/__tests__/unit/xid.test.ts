import { afterEach, describe, expect, it, vi } from 'vitest'
import { BufferError, InvalidInputError, ParseError } from '@/src/errors'
import { ksuid } from '@/src/ksuid/ksuid'
import { ulid } from '@/src/ulid/ulid'
import { xid } from '@/src/xid/xid'
import { expectValidTypeGuard } from '../helpers/assertions'

async function importFreshXidModule() {
  vi.resetModules()
  return import('@/src/xid/xid')
}

function counterOf(id: string, generator: typeof xid = xid): number {
  const bytes = generator.toBytes(id)
  return (bytes[9] << 16) | (bytes[10] << 8) | bytes[11]
}

describe('xid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('generates a canonical lowercase base32hex string', () => {
    const id = xid()
    expect(id).toMatch(/^[0-9a-v]{19}[0g]$/)
    expect(xid.fromBytes(xid.toBytes(id))).toBe(id)
  })

  it('uses the rs/xid known-answer vector', () => {
    const bytes = new Uint8Array([0x4d, 0x88, 0xe1, 0x5b, 0x60, 0xf4, 0x86, 0xe4, 0x28, 0x41, 0x2d, 0xc9])
    const id = '9m4e2mr0ui3e8a215n4g'

    expect(xid.fromBytes(bytes)).toBe(id)
    expect(xid.toBytes(id)).toEqual(bytes)
    expect(xid.timestamp(id)).toBe(1_300_816_219_000)
  })

  it('embeds the current timestamp and returns milliseconds', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    vi.setSystemTime(1_700_000_000_123)
    const id = freshXid()

    expect(freshXid.timestamp(id)).toBe(1_700_000_000_000)
  })

  it('caches identity bytes and advances the shared counter', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    vi.setSystemTime(1_700_000_000_000)
    const first = freshXid()
    const second = freshXid()
    const firstBytes = freshXid.toBytes(first)
    const secondBytes = freshXid.toBytes(second)

    expect(secondBytes.slice(4, 9)).toEqual(firstBytes.slice(4, 9))
    expect(counterOf(second, freshXid)).toBe((counterOf(first, freshXid) + 1) & 0xffffff)
  })

  it('uses supplied identity values while retaining the shared counter', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    const options = { msecs: 1_700_000_000_000, machineId: new Uint8Array([1, 2, 3]), processId: 0x4567 }
    const first = freshXid(options)
    const second = freshXid(options)

    expect(freshXid.toBytes(first).slice(4, 9)).toEqual(new Uint8Array([1, 2, 3, 0x45, 0x67]))
    expect(counterOf(second, freshXid)).toBe((counterOf(first, freshXid) + 1) & 0xffffff)
  })

  it('keeps a partial supplied identity stable and explicit counters do not consume state', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    const first = freshXid({ msecs: 1000, machineId: new Uint8Array([1, 2, 3]) })
    const second = freshXid({ msecs: 1000, machineId: new Uint8Array([1, 2, 3]), counter: 42 })
    const third = freshXid({ msecs: 1000, machineId: new Uint8Array([1, 2, 3]) })

    expect(freshXid.toBytes(second).slice(4, 9)).toEqual(freshXid.toBytes(first).slice(4, 9))
    expect(counterOf(second, freshXid)).toBe(42)
    expect(counterOf(third, freshXid)).toBe((counterOf(first, freshXid) + 1) & 0xffffff)
  })

  it('keeps a process ID-only partial identity stable', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    const first = freshXid({ msecs: 1000, processId: 0x4567 })
    const second = freshXid({ msecs: 1000, processId: 0x4567 })
    const firstBytes = freshXid.toBytes(first)
    const secondBytes = freshXid.toBytes(second)

    expect(firstBytes.slice(7, 9)).toEqual(new Uint8Array([0x45, 0x67]))
    expect(secondBytes.slice(4, 9)).toEqual(firstBytes.slice(4, 9))
  })

  it('is deterministic when every field is supplied', () => {
    const options = {
      msecs: 0xffffffff * 1000,
      machineId: new Uint8Array([1, 2, 3]),
      processId: 0xabcd,
      counter: 0xffffff,
    }
    expect(xid(options)).toBe(xid(options))
  })

  it('writes bytes to a caller-owned buffer', () => {
    const buffer = new Uint8Array(24)
    const options = { msecs: 1000, machineId: new Uint8Array([1, 2, 3]), processId: 4, counter: 5 }

    expect(xid(options, buffer, 6)).toBe(buffer)
    expect(buffer.slice(6, 18)).toEqual(xid.toBytes(xid(options)))
    expect(() => xid(options, buffer, 13)).toThrow(BufferError)
  })

  it.each([0, 0xffffffff * 1000])('round-trips timestamp boundary %i', (msecs) => {
    const id = xid({ msecs, machineId: new Uint8Array(3), processId: 0, counter: 0 })
    expect(xid.timestamp(id)).toBe(msecs)
  })

  it.each([0, 0xffffff])('round-trips counter boundary %i', (counter) => {
    const id = xid({ msecs: 0, machineId: new Uint8Array(3), processId: 0, counter })
    expect(xid.fromBytes(xid.toBytes(id))).toBe(id)
  })

  it('wraps the shared counter', async () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint8Array) array.fill(0xff)
      return array
    })
    const { xid: freshXid } = await importFreshXidModule()
    const first = freshXid({ msecs: 1000 })
    const second = freshXid({ msecs: 1000 })

    expect(counterOf(first, freshXid)).toBe(0)
    expect(counterOf(second, freshXid)).toBe(1)
  })

  it('rejects invalid options and byte lengths with shared errors', () => {
    expect(() => xid({ machineId: new Uint8Array(2) })).toThrow(InvalidInputError)
    expect(() => xid({ processId: 0x10000 })).toThrow(InvalidInputError)
    expect(() => xid({ msecs: -1 })).toThrow(InvalidInputError)
    expect(() => xid({ counter: 0x1000000 })).toThrow(InvalidInputError)
    expect(() => xid.fromBytes(new Uint8Array(11))).toThrow(BufferError)
  })

  describe('deprecated secs alias', () => {
    // TODO(v1-rc): remove this block together with the `secs` option.
    it('accepts whole seconds until v1-rc', () => {
      const id = xid({ secs: 1_700_000_000, machineId: new Uint8Array(3), processId: 0, counter: 0 })
      expect(xid.timestamp(id)).toBe(1_700_000_000_000)
    })

    it('validates the seconds range', () => {
      expect(() => xid({ secs: -1 })).toThrow(InvalidInputError)
      expect(() => xid({ secs: 0x100000000 })).toThrow(InvalidInputError)
    })

    it('rejects passing both msecs and secs', () => {
      let error: unknown
      try {
        xid({ msecs: 1_700_000_000_000, secs: 1_700_000_000 })
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'CONFLICTING_OPTIONS', strategy: 'xid' })
    })
  })

  it.each([
    'c6e52g2mrqcjl44hf179',
    '9M4E2MR0UI3E8A215N4G',
    'x'.repeat(20),
    '0'.repeat(19),
  ])('rejects malformed input %s', (id) => {
    expect(xid.isValid(id)).toBe(false)
    expect(() => xid.toBytes(id)).toThrow(ParseError)
  })

  it('is a type guard and has canonical NIL and MAX constants', () => {
    const maybeId: unknown = xid()
    expectValidTypeGuard<string>(maybeId, xid.isValid)
    expect(xid.isValid(123)).toBe(false)
    expect(xid.NIL).toBe('0'.repeat(20))
    expect(xid.toBytes(xid.NIL)).toEqual(new Uint8Array(12))
    expect(xid.fromBytes(new Uint8Array(12).fill(0xff))).toBe(xid.MAX)
    expect(xid.isValid(xid.MAX)).toBe(true)
  })

  it('keeps cached identity bytes independent of random-pool refills', async () => {
    const { xid: freshXid } = await importFreshXidModule()
    const first = freshXid.toBytes(freshXid()).slice(4, 9)
    for (let i = 0; i < 64; i += 1) {
      ulid()
      ksuid()
    }
    expect(freshXid.toBytes(freshXid()).slice(4, 9)).toEqual(first)
  })
})
