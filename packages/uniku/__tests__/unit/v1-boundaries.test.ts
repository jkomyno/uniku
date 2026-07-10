import { describe, expect, it } from 'vitest'
import { cuidv2 } from '@/src/cuid/v2'
import { BufferError, InvalidInputError } from '@/src/errors'
import { ksuid } from '@/src/ksuid/ksuid'
import { objectid } from '@/src/objectid/objectid'
import { tsid } from '@/src/tsid/tsid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'

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

    for (const testCase of cases) {
      it(testCase.name, () => {
        expect(testCase.generate).toThrow(InvalidInputError)
      })
    }
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
    ]

    for (const testCase of cases) {
      it(testCase.name, () => {
        expect(testCase.decode).toThrow(BufferError)
      })
    }
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
        name: 'TSID rejects fractional offsets',
        generate: () => tsid({ msecs: 1_700_000_000_000, node: 0, counter: 0 }, zeroes(16), 0.5),
      },
    ]

    for (const testCase of cases) {
      it(testCase.name, () => {
        expect(testCase.generate).toThrow(BufferError)
      })
    }
  })

  describe('caller-owned values', () => {
    it.fails('UUID v4 does not mutate caller-provided random bytes', () => {
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

    for (const testCase of invalidTsidCases) {
      it.fails(testCase.name, () => {
        expect(testCase.convert).toThrow(InvalidInputError)
      })
    }
  })
})
