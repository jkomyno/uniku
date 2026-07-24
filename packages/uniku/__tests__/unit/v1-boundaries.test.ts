import { describe, expect, it, test } from 'vitest'
import { cuidv2 } from '@/src/cuid/v2'
import { BufferError, InvalidInputError, ParseError } from '@/src/errors'
import { ksuid } from '@/src/ksuid/ksuid'
import { nanoid } from '@/src/nanoid/nanoid'
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
        generate: () => ksuid({ msecs: Number.NaN, random: zeroes(16) }),
      },
      {
        name: 'KSUID rejects fractional timestamps',
        generate: () => ksuid({ msecs: 1_500_000_000_000.5, random: zeroes(16) }),
      },
      {
        name: 'ObjectID rejects NaN timestamps',
        generate: () => objectid({ msecs: Number.NaN, random: zeroes(5), counter: 0 }),
      },
      {
        name: 'ObjectID rejects fractional counters',
        generate: () => objectid({ msecs: 0, random: zeroes(5), counter: 1.5 }),
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
        generate: () => ksuid({ msecs: 0 }),
      },
      {
        name: 'KSUID rejects timestamps above its maximum',
        strategy: 'ksuid',
        generate: () => ksuid({ msecs: (KSUID_MAX_SECS + 1) * 1000 }),
      },
      {
        name: 'ObjectID rejects out-of-range timestamps',
        strategy: 'objectid',
        generate: () => objectid({ msecs: -1 }),
      },
      {
        name: 'XID rejects out-of-range timestamps',
        strategy: 'xid',
        generate: () => xid({ msecs: 2 ** 32 * 1000 }),
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

  describe('unified error codes', () => {
    type UnifiedCase = {
      readonly name: string
      readonly code: string
      readonly strategy: string
      readonly errorClass: new (...args: never[]) => Error
      readonly run: () => unknown
    }

    const cases: ReadonlyArray<UnifiedCase> = [
      // Parse failures: INVALID_CHAR
      {
        name: 'UUID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'uuid',
        errorClass: ParseError,
        run: () => uuidv4.toBytes('zzzzzzzz-0000-4000-8000-000000000000'),
      },
      {
        name: 'ULID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'ulid',
        errorClass: ParseError,
        run: () => ulid.toBytes(`!${'0'.repeat(25)}`),
      },
      {
        name: 'KSUID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'ksuid',
        errorClass: ParseError,
        run: () => ksuid.toBytes('!'.repeat(27)),
      },
      {
        name: 'ObjectID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'objectid',
        errorClass: ParseError,
        run: () => objectid.toBytes('g'.repeat(24)),
      },
      {
        name: 'XID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'xid',
        errorClass: ParseError,
        run: () => xid.toBytes('w'.repeat(20)),
      },
      {
        name: 'TSID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'tsid',
        errorClass: ParseError,
        run: () => tsid.fromString('!'.repeat(13)),
      },
      {
        name: 'TypeID reports INVALID_CHAR',
        code: 'INVALID_CHAR',
        strategy: 'typeid',
        errorClass: ParseError,
        run: () => typeid.toBytes(`user_${'!'.repeat(26)}`),
      },
      // Parse failures: INVALID_LENGTH
      {
        name: 'UUID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'uuid',
        errorClass: ParseError,
        run: () => uuidv4.toBytes('abc'),
      },
      {
        name: 'ULID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'ulid',
        errorClass: ParseError,
        run: () => ulid.toBytes('abc'),
      },
      {
        name: 'KSUID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'ksuid',
        errorClass: ParseError,
        run: () => ksuid.toBytes('abc'),
      },
      {
        name: 'ObjectID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'objectid',
        errorClass: ParseError,
        run: () => objectid.toBytes('abc'),
      },
      {
        name: 'XID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'xid',
        errorClass: ParseError,
        run: () => xid.toBytes('abc'),
      },
      {
        name: 'TSID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'tsid',
        errorClass: ParseError,
        run: () => tsid.fromString('abc'),
      },
      {
        name: 'TypeID reports INVALID_LENGTH',
        code: 'INVALID_LENGTH',
        strategy: 'typeid',
        errorClass: ParseError,
        run: () => typeid.toBytes('user_abc'),
      },
      // Parse failures: structural
      {
        name: 'UUID reports INVALID_FORMAT for bad separators',
        code: 'INVALID_FORMAT',
        strategy: 'uuid',
        errorClass: ParseError,
        run: () => uuidv4.toBytes('00000000_0000-4000-8000-000000000000'),
      },
      {
        name: 'TypeID reports INVALID_FORMAT for a leading underscore',
        code: 'INVALID_FORMAT',
        strategy: 'typeid',
        errorClass: ParseError,
        run: () => typeid.toBytes(`_${'0'.repeat(26)}`),
      },
      {
        name: 'KSUID reports VALUE_OUT_OF_RANGE above 160 bits',
        code: 'VALUE_OUT_OF_RANGE',
        strategy: 'ksuid',
        errorClass: ParseError,
        run: () => ksuid.toBytes('z'.repeat(27)),
      },
      {
        name: 'TSID reports VALUE_OUT_OF_RANGE for an overflowing leading character',
        code: 'VALUE_OUT_OF_RANGE',
        strategy: 'tsid',
        errorClass: ParseError,
        run: () => tsid.fromString(`G${'0'.repeat(12)}`),
      },
      {
        name: 'TypeID reports VALUE_OUT_OF_RANGE above 128 bits',
        code: 'VALUE_OUT_OF_RANGE',
        strategy: 'typeid',
        errorClass: ParseError,
        run: () => typeid.toBytes(`user_8${'z'.repeat(25)}`),
      },
      {
        name: 'XID reports NON_CANONICAL for non-canonical trailing bits',
        code: 'NON_CANONICAL',
        strategy: 'xid',
        errorClass: ParseError,
        run: () => xid.toBytes(`${'0'.repeat(19)}1`),
      },
      // Option failures: random bytes
      {
        name: 'UUID v4 reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'uuid',
        errorClass: InvalidInputError,
        run: () => uuidv4({ random: zeroes(15) }),
      },
      {
        name: 'ULID reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'ulid',
        errorClass: InvalidInputError,
        run: () => ulid({ msecs: 0, random: zeroes(9) }),
      },
      {
        name: 'KSUID reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'ksuid',
        errorClass: InvalidInputError,
        run: () => ksuid({ random: zeroes(15) }),
      },
      {
        name: 'ObjectID reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'objectid',
        errorClass: InvalidInputError,
        run: () => objectid({ random: zeroes(4) }),
      },
      {
        name: 'Nanoid reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'nanoid',
        errorClass: InvalidInputError,
        run: () => nanoid({ size: 21, random: zeroes(20) }),
      },
      {
        name: 'CUID2 reports RANDOM_BYTES_TOO_SHORT',
        code: 'RANDOM_BYTES_TOO_SHORT',
        strategy: 'cuid',
        errorClass: InvalidInputError,
        run: () => cuidv2({ random: zeroes(0) }),
      },
      // Option failures: numeric fields
      {
        name: 'UUID v7 reports SEQUENCE_OUT_OF_RANGE',
        code: 'SEQUENCE_OUT_OF_RANGE',
        strategy: 'uuid',
        errorClass: InvalidInputError,
        run: () => uuidv7({ seq: -1 }),
      },
      {
        name: 'ObjectID reports COUNTER_OUT_OF_RANGE',
        code: 'COUNTER_OUT_OF_RANGE',
        strategy: 'objectid',
        errorClass: InvalidInputError,
        run: () => objectid({ counter: -1 }),
      },
      {
        name: 'XID reports COUNTER_OUT_OF_RANGE',
        code: 'COUNTER_OUT_OF_RANGE',
        strategy: 'xid',
        errorClass: InvalidInputError,
        run: () => xid({ counter: -1 }),
      },
      {
        name: 'TSID reports COUNTER_OUT_OF_RANGE',
        code: 'COUNTER_OUT_OF_RANGE',
        strategy: 'tsid',
        errorClass: InvalidInputError,
        run: () => tsid({ counter: -1 }),
      },
      {
        name: 'TSID reports NODE_OUT_OF_RANGE',
        code: 'NODE_OUT_OF_RANGE',
        strategy: 'tsid',
        errorClass: InvalidInputError,
        run: () => tsid({ node: -1 }),
      },
      {
        name: 'TSID reports NODE_BITS_OUT_OF_RANGE',
        code: 'NODE_BITS_OUT_OF_RANGE',
        strategy: 'tsid',
        errorClass: InvalidInputError,
        run: () => tsid({ nodeBits: -1 }),
      },
      {
        name: 'TSID reports EPOCH_INVALID',
        code: 'EPOCH_INVALID',
        strategy: 'tsid',
        errorClass: InvalidInputError,
        run: () => tsid({ epoch: 1.5 }),
      },
      {
        name: 'TSID reports VALUE_OUT_OF_RANGE for negative values',
        code: 'VALUE_OUT_OF_RANGE',
        strategy: 'tsid',
        errorClass: InvalidInputError,
        run: () => tsid.toBytes(-1n),
      },
      {
        name: 'XID reports PROCESS_ID_OUT_OF_RANGE',
        code: 'PROCESS_ID_OUT_OF_RANGE',
        strategy: 'xid',
        errorClass: InvalidInputError,
        run: () => xid({ processId: 0x10000 }),
      },
      {
        name: 'XID reports MACHINE_ID_BYTES_TOO_SHORT',
        code: 'MACHINE_ID_BYTES_TOO_SHORT',
        strategy: 'xid',
        errorClass: InvalidInputError,
        run: () => xid({ machineId: zeroes(2) }),
      },
      // Option failures: TypeID prefix and UUID wrapping
      {
        name: 'TypeID reports PREFIX_TOO_LONG',
        code: 'PREFIX_TOO_LONG',
        strategy: 'typeid',
        errorClass: InvalidInputError,
        run: () => typeid('a'.repeat(64)),
      },
      {
        name: 'TypeID reports PREFIX_INVALID_CHAR',
        code: 'PREFIX_INVALID_CHAR',
        strategy: 'typeid',
        errorClass: InvalidInputError,
        run: () => typeid('User'),
      },
      {
        name: 'TypeID reports PREFIX_INVALID_BOUNDARY',
        code: 'PREFIX_INVALID_BOUNDARY',
        strategy: 'typeid',
        errorClass: InvalidInputError,
        run: () => typeid('_user'),
      },
      {
        name: 'TypeID reports UUID_NOT_V7 when wrapping a UUID v4',
        code: 'UUID_NOT_V7',
        strategy: 'typeid',
        errorClass: InvalidInputError,
        run: () => typeid.fromUuid('user', uuidv4({ random: zeroes(16) })),
      },
      // Option failures: string-native shapes
      {
        name: 'Nanoid reports ALPHABET_OUT_OF_RANGE',
        code: 'ALPHABET_OUT_OF_RANGE',
        strategy: 'nanoid',
        errorClass: InvalidInputError,
        run: () => nanoid({ alphabet: 'a' }),
      },
      {
        name: 'Nanoid reports ALPHABET_DUPLICATE',
        code: 'ALPHABET_DUPLICATE',
        strategy: 'nanoid',
        errorClass: InvalidInputError,
        run: () => nanoid({ alphabet: 'aa' }),
      },
      {
        name: 'Nanoid reports ALPHABET_INVALID_CHAR',
        code: 'ALPHABET_INVALID_CHAR',
        strategy: 'nanoid',
        errorClass: InvalidInputError,
        run: () => nanoid({ alphabet: 'a\u20ac' }),
      },
      {
        name: 'Nanoid reports SIZE_OUT_OF_RANGE',
        code: 'SIZE_OUT_OF_RANGE',
        strategy: 'nanoid',
        errorClass: InvalidInputError,
        run: () => nanoid(-1),
      },
      {
        name: 'CUID2 reports LENGTH_OUT_OF_RANGE',
        code: 'LENGTH_OUT_OF_RANGE',
        strategy: 'cuid',
        errorClass: InvalidInputError,
        run: () => cuidv2({ length: 1 }),
      },
    ]

    test.each(cases)('$name', ({ run, code, strategy, errorClass }) => {
      let error: unknown
      try {
        run()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(errorClass)
      expect(error).toMatchObject({ code, strategy })
    })
  })

  describe('canonical byte lengths', () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly strategy: string; readonly decode: () => unknown }> = [
      {
        name: 'UUID v4 rejects short byte arrays',
        strategy: 'uuid',
        decode: () => uuidv4.fromBytes(zeroes(15)),
      },
      {
        name: 'UUID v4 rejects oversized byte arrays',
        strategy: 'uuid',
        decode: () => uuidv4.fromBytes(zeroes(17)),
      },
      {
        name: 'UUID v7 rejects oversized byte arrays',
        strategy: 'uuid',
        decode: () => uuidv7.fromBytes(zeroes(17)),
      },
      {
        name: 'ULID rejects oversized byte arrays',
        strategy: 'ulid',
        decode: () => ulid.fromBytes(zeroes(17)),
      },
      {
        name: 'KSUID rejects oversized byte arrays',
        strategy: 'ksuid',
        decode: () => ksuid.fromBytes(zeroes(21)),
      },
      {
        name: 'ObjectID rejects oversized byte arrays',
        strategy: 'objectid',
        decode: () => objectid.fromBytes(zeroes(13)),
      },
      {
        name: 'XID rejects oversized byte arrays',
        strategy: 'xid',
        decode: () => xid.fromBytes(zeroes(13)),
      },
    ]

    test.each(cases)('$name', ({ decode, strategy }) => {
      let error: unknown
      try {
        decode()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(BufferError)
      expect(error).toMatchObject({ code: 'BYTES_INVALID_LENGTH', strategy })
    })
  })

  describe('buffer offsets', () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly strategy: string; readonly generate: () => unknown }> =
      [
        {
          name: 'UUID v4 rejects fractional offsets',
          strategy: 'uuid',
          generate: () => uuidv4({ random: zeroes(16) }, zeroes(32), 0.5),
        },
        {
          name: 'UUID v7 rejects fractional offsets',
          strategy: 'uuid',
          generate: () => uuidv7({ msecs: 0, random: zeroes(16), seq: 0 }, zeroes(32), 0.5),
        },
        {
          name: 'ULID rejects fractional offsets',
          strategy: 'ulid',
          generate: () => ulid({ msecs: 0, random: zeroes(10) }, zeroes(32), 0.5),
        },
        {
          name: 'KSUID rejects fractional offsets',
          strategy: 'ksuid',
          generate: () => ksuid({ msecs: 1_500_000_000_000, random: zeroes(16) }, zeroes(32), 0.5),
        },
        {
          name: 'ObjectID rejects fractional offsets',
          strategy: 'objectid',
          generate: () => objectid({ msecs: 0, random: zeroes(5), counter: 0 }, zeroes(32), 0.5),
        },
        {
          name: 'XID rejects fractional offsets',
          strategy: 'xid',
          generate: () => xid({ msecs: 0, machineId: zeroes(3), processId: 0, counter: 0 }, zeroes(32), 0.5),
        },
        {
          name: 'TSID rejects fractional offsets',
          strategy: 'tsid',
          generate: () => tsid({ msecs: 1_700_000_000_000, node: 0, counter: 0 }, zeroes(16), 0.5),
        },
      ]

    test.each(cases)('$name', ({ generate, strategy }) => {
      let error: unknown
      try {
        generate()
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(BufferError)
      expect(error).toMatchObject({ code: 'BUFFER_OUT_OF_BOUNDS', strategy })
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
