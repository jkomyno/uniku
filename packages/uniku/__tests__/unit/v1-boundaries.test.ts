import { describe, expect, it, test } from 'vitest'
import { cuidv2 } from '@/src/cuid/v2'
import { BufferError, InvalidInputError, ParseError } from '@/src/errors'
import { ksuid } from '@/src/ksuid/ksuid'
import { objectid } from '@/src/objectid/objectid'
import { tsid } from '@/src/tsid/tsid'
import { typeid } from '@/src/typeid/typeid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'
import { xid } from '@/src/xid/xid'

const zeroes = (length: number) => new Uint8Array(length)

describe('v1 public boundary contract', () => {
  describe('finite integer options', () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly generate: () => unknown }> = [
      {
        name: 'UUID v7 rejects negative timestamps',
        generate: () => uuidv7({ msecs: -1, random: zeroes(16), seq: 0 }),
      },
      {
        name: 'UUID v7 rejects timestamps above 48 bits',
        generate: () => uuidv7({ msecs: 2 ** 48, random: zeroes(16), seq: 0 }),
      },
      {
        name: 'UUID v7 rejects NaN sequences',
        generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: Number.NaN }),
      },
      {
        name: 'UUID v7 rejects fractional sequences',
        generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: 1.5 }),
      },
      {
        name: 'UUID v7 rejects negative sequences',
        generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: -1 }),
      },
      {
        name: 'UUID v7 rejects sequences above 32 bits',
        generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: 2 ** 32 }),
      },
      {
        name: 'ULID rejects negative timestamps',
        generate: () => ulid({ msecs: -1, random: zeroes(10) }),
      },
      {
        name: 'ULID rejects timestamps above 48 bits',
        generate: () => ulid({ msecs: 2 ** 48, random: zeroes(10) }),
      },
      {
        name: 'KSUID rejects NaN timestamps',
        generate: () => ksuid({ secs: Number.NaN, random: zeroes(16) }),
      },
      {
        name: 'KSUID rejects fractional timestamps',
        generate: () => ksuid({ secs: 1_500_000_000.5, random: zeroes(16) }),
      },
      {
        name: 'ObjectID rejects NaN timestamps',
        generate: () => objectid({ secs: Number.NaN, random: zeroes(5), counter: 0 }),
      },
      {
        name: 'ObjectID rejects fractional counters',
        generate: () => objectid({ secs: 0, random: zeroes(5), counter: 1.5 }),
      },
      {
        name: 'XID rejects fractional process IDs',
        generate: () => xid({ processId: 1.5 }),
      },
      {
        name: 'XID rejects fractional counters',
        generate: () => xid({ counter: 1.5 }),
      },
      {
        name: 'TSID rejects fractional node-bit allocations',
        generate: () => tsid({ nodeBits: 1.5 }),
      },
      {
        name: 'TSID rejects fractional node IDs',
        generate: () => tsid({ msecs: 1_700_000_000_000, node: 1.5, counter: 0 }),
      },
      {
        name: 'CUID2 rejects fractional lengths with a typed error',
        generate: () => cuidv2({ length: 2.5 }),
      },
    ]

    test.each(cases)('$name', ({ generate }) => {
      expect(generate).toThrow(InvalidInputError)
    })

    it('UUID v7 accepts the maximum unsigned 32-bit sequence', () => {
      expect(() => uuidv7({ msecs: 0, random: zeroes(16), seq: 0xffffffff })).not.toThrow()
    })
  })

  describe('timestamp error codes', () => {
    const KSUID_MAX_SECS = 1_400_000_000 + 0xffffffff

    const cases: ReadonlyArray<{
      readonly name: string
      readonly strategy: string
      readonly generate: () => unknown
    }> = [
      {
        name: 'UUID v7 rejects out-of-range timestamps',
        strategy: 'uuid',
        generate: () => uuidv7({ msecs: -1 }),
      },
      {
        name: 'ULID rejects out-of-range timestamps',
        strategy: 'ulid',
        generate: () => ulid({ msecs: 2 ** 48 }),
      },
      {
        name: 'TypeID attributes timestamp failures to the typeid boundary',
        strategy: 'typeid',
        generate: () => typeid('user', { msecs: -1 }),
      },
      {
        name: 'KSUID rejects timestamps below its epoch',
        strategy: 'ksuid',
        generate: () => ksuid({ secs: 0 }),
      },
      {
        name: 'KSUID rejects timestamps above its maximum',
        strategy: 'ksuid',
        generate: () => ksuid({ secs: KSUID_MAX_SECS + 1 }),
      },
      {
        name: 'ObjectID rejects out-of-range timestamps',
        strategy: 'objectid',
        generate: () => objectid({ secs: -1 }),
      },
      {
        name: 'XID rejects out-of-range timestamps',
        strategy: 'xid',
        generate: () => xid({ secs: 2 ** 32 }),
      },
      {
        name: 'TSID rejects non-integer timestamps',
        strategy: 'tsid',
        generate: () => tsid({ msecs: 1.5 }),
      },
      {
        name: 'TSID rejects timestamps outside its epoch window',
        strategy: 'tsid',
        generate: () => tsid({ msecs: 0 }),
      },
    ]

    test.each(cases)('$name', ({ generate, strategy }) => {
      let error: unknown
      try {
        generate()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(InvalidInputError)
      expect(error).toMatchObject({ code: 'TIMESTAMP_OUT_OF_RANGE', strategy })
    })

    it('ULID decode-time overflow reports the same code as a ParseError', () => {
      let error: unknown
      try {
        ulid.timestamp('8ZZZZZZZZZZZZZZZZZZZZZZZZZ')
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(ParseError)
      expect(error).toMatchObject({ code: 'TIMESTAMP_OUT_OF_RANGE', strategy: 'ulid' })
    })
  })

  describe('canonical byte lengths', () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly decode: () => unknown }> = [
      {
        name: 'UUID v4 rejects short byte arrays',
        decode: () => uuidv4.fromBytes(zeroes(15)),
      },
      {
        name: 'UUID v4 rejects oversized byte arrays',
        decode: () => uuidv4.fromBytes(zeroes(17)),
      },
      {
        name: 'UUID v7 rejects oversized byte arrays',
        decode: () => uuidv7.fromBytes(zeroes(17)),
      },
      {
        name: 'ULID rejects oversized byte arrays',
        decode: () => ulid.fromBytes(zeroes(17)),
      },
      {
        name: 'KSUID rejects oversized byte arrays',
        decode: () => ksuid.fromBytes(zeroes(21)),
      },
      {
        name: 'ObjectID rejects oversized byte arrays',
        decode: () => objectid.fromBytes(zeroes(13)),
      },
      {
        name: 'XID rejects oversized byte arrays',
        decode: () => xid.fromBytes(zeroes(13)),
      },
    ]

    test.each(cases)('$name', ({ decode }) => {
      expect(decode).toThrow(BufferError)
    })
  })

  describe('buffer offsets', () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly generate: () => unknown }> = [
      {
        name: 'UUID v4 rejects fractional offsets',
        generate: () => uuidv4({ random: zeroes(16) }, zeroes(32), 0.5),
      },
      {
        name: 'UUID v7 rejects fractional offsets',
        generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: 0 }, zeroes(32), 0.5),
      },
      {
        name: 'ULID rejects fractional offsets',
        generate: () => ulid({ msecs: 0, random: zeroes(10) }, zeroes(32), 0.5),
      },
      {
        name: 'KSUID rejects fractional offsets',
        generate: () => ksuid({ secs: 1_500_000_000, random: zeroes(16) }, zeroes(32), 0.5),
      },
      {
        name: 'ObjectID rejects fractional offsets',
        generate: () => objectid({ secs: 0, random: zeroes(5), counter: 0 }, zeroes(32), 0.5),
      },
      {
        name: 'XID rejects fractional offsets',
        generate: () => xid({ secs: 0, machineId: zeroes(3), processId: 0, counter: 0 }, zeroes(32), 0.5),
      },
      {
        name: 'TSID rejects fractional offsets',
        generate: () => tsid({ msecs: 1_700_000_000_000, node: 0, counter: 0 }, zeroes(16), 0.5),
      },
    ]

    test.each(cases)('$name', ({ generate }) => {
      expect(generate).toThrow(BufferError)
    })
  })

  describe('caller-owned values', () => {
    it('UUID v4 does not mutate caller-provided random bytes', () => {
      const random = new Uint8Array(16).fill(0xff)
      const before = random.slice()

      uuidv4({ random })

      expect(random).toEqual(before)
    })

    const invalidTsidCases: ReadonlyArray<{ readonly name: string; readonly convert: () => unknown }> = [
      { name: 'TSID toBytes rejects negative values', convert: () => tsid.toBytes(-1n) },
      { name: 'TSID toString rejects negative values', convert: () => tsid.toString(-1n) },
      { name: 'TSID timestamp rejects negative values', convert: () => tsid.timestamp(-1n) },
      { name: 'TSID toBytes rejects values above 64 bits', convert: () => tsid.toBytes(tsid.MAX + 1n) },
    ]

    test.each(invalidTsidCases)('$name', ({ convert }) => {
      expect(convert).toThrow(InvalidInputError)
    })
  })
})
