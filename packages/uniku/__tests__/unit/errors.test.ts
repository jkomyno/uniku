import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  BufferError,
  ERROR_CODES,
  type ErrorCode,
  InvalidInputError,
  ParseError,
  type UniqueIdError,
} from '@/src/errors'
import type { IdGenerator } from '@/src/generators'

type ErrorClassName = 'InvalidInputError' | 'ParseError' | 'BufferError'
type ErrorMetadata = {
  readonly code: ErrorCode
  readonly classes: ReadonlyArray<ErrorClassName>
  readonly strategies: ReadonlyArray<IdGenerator>
}

const EXPECTED_ERROR_METADATA = [
  {
    code: 'TIMESTAMP_OUT_OF_RANGE',
    classes: ['InvalidInputError', 'ParseError'],
    strategies: ['uuid', 'ulid', 'typeid', 'ksuid', 'objectid', 'tsid', 'xid'],
  },
  {
    code: 'CONFLICTING_OPTIONS',
    classes: ['InvalidInputError'],
    strategies: ['uuid', 'typeid', 'nanoid', 'ksuid', 'objectid', 'xid'],
  },
  {
    code: 'COUNTER_OUT_OF_RANGE',
    classes: ['InvalidInputError'],
    strategies: ['uuid', 'typeid', 'objectid', 'tsid', 'xid'],
  },
  { code: 'NODE_OUT_OF_RANGE', classes: ['InvalidInputError'], strategies: ['tsid'] },
  { code: 'NODE_BITS_OUT_OF_RANGE', classes: ['InvalidInputError'], strategies: ['tsid'] },
  { code: 'EPOCH_INVALID', classes: ['InvalidInputError'], strategies: ['tsid'] },
  { code: 'PROCESS_ID_OUT_OF_RANGE', classes: ['InvalidInputError'], strategies: ['xid'] },
  { code: 'MACHINE_ID_BYTES_TOO_SHORT', classes: ['InvalidInputError'], strategies: ['xid'] },
  {
    code: 'RANDOM_BYTES_TOO_SHORT',
    classes: ['InvalidInputError'],
    strategies: ['uuid', 'ulid', 'typeid', 'nanoid', 'cuid', 'ksuid', 'objectid'],
  },
  { code: 'RANDOM_OVERFLOW', classes: ['InvalidInputError'], strategies: ['ulid'] },
  { code: 'LENGTH_OUT_OF_RANGE', classes: ['InvalidInputError'], strategies: ['nanoid', 'cuid'] },
  { code: 'ALPHABET_OUT_OF_RANGE', classes: ['InvalidInputError'], strategies: ['nanoid'] },
  { code: 'ALPHABET_INVALID_CHAR', classes: ['InvalidInputError'], strategies: ['nanoid'] },
  { code: 'ALPHABET_DUPLICATE', classes: ['InvalidInputError'], strategies: ['nanoid'] },
  { code: 'PREFIX_TOO_LONG', classes: ['InvalidInputError'], strategies: ['typeid'] },
  { code: 'PREFIX_INVALID_CHAR', classes: ['InvalidInputError'], strategies: ['typeid'] },
  { code: 'PREFIX_INVALID_BOUNDARY', classes: ['InvalidInputError'], strategies: ['typeid'] },
  { code: 'UUID_NOT_V7', classes: ['InvalidInputError'], strategies: ['typeid'] },
  {
    code: 'BYTES_INVALID_LENGTH',
    classes: ['InvalidInputError', 'BufferError'],
    strategies: ['uuid', 'ulid', 'typeid', 'ksuid', 'objectid', 'tsid', 'xid'],
  },
  {
    code: 'BUFFER_OUT_OF_BOUNDS',
    classes: ['BufferError'],
    strategies: ['uuid', 'ulid', 'typeid', 'ksuid', 'objectid', 'tsid', 'xid'],
  },
  {
    code: 'INVALID_CHAR',
    classes: ['ParseError'],
    strategies: ['uuid', 'ulid', 'typeid', 'ksuid', 'objectid', 'tsid', 'xid'],
  },
  {
    code: 'INVALID_LENGTH',
    classes: ['ParseError'],
    strategies: ['uuid', 'ulid', 'typeid', 'ksuid', 'objectid', 'tsid', 'xid'],
  },
  { code: 'INVALID_FORMAT', classes: ['ParseError'], strategies: ['uuid', 'typeid'] },
  { code: 'NON_CANONICAL', classes: ['ParseError'], strategies: ['xid'] },
  {
    code: 'VALUE_OUT_OF_RANGE',
    classes: ['InvalidInputError', 'ParseError'],
    strategies: ['typeid', 'ksuid', 'tsid'],
  },
] as const satisfies ReadonlyArray<ErrorMetadata>

const PRE_V1_ERROR_CODES = [
  'CUID2_LENGTH_OUT_OF_RANGE',
  'CUID2_RANDOM_BYTES_EMPTY',
  'KSUID_BUFFER_OUT_OF_BOUNDS',
  'KSUID_BYTES_INVALID_LENGTH',
  'KSUID_BYTES_TOO_SHORT',
  'KSUID_INVALID_CHAR',
  'KSUID_INVALID_LENGTH',
  'KSUID_OVERFLOW',
  'KSUID_RANDOM_BYTES_TOO_SHORT',
  'KSUID_TIMESTAMP_TOO_HIGH',
  'KSUID_TIMESTAMP_TOO_LOW',
  'NANOID_ALPHABET_DUPLICATE',
  'NANOID_ALPHABET_INVALID_CHAR',
  'NANOID_ALPHABET_TOO_LONG',
  'NANOID_ALPHABET_TOO_SHORT',
  'NANOID_RANDOM_BYTES_INSUFFICIENT',
  'NANOID_SIZE_INVALID',
  'NANOID_SIZE_TOO_LARGE',
  'OBJECTID_BUFFER_OUT_OF_BOUNDS',
  'OBJECTID_BYTES_INVALID_LENGTH',
  'OBJECTID_BYTES_TOO_SHORT',
  'OBJECTID_COUNTER_OUT_OF_RANGE',
  'OBJECTID_INVALID_CHAR',
  'OBJECTID_INVALID_LENGTH',
  'OBJECTID_RANDOM_BYTES_TOO_SHORT',
  'OBJECTID_TIMESTAMP_OUT_OF_RANGE',
  'TSID_BUFFER_OUT_OF_BOUNDS',
  'TSID_BYTES_INVALID_LENGTH',
  'TSID_COUNTER_OUT_OF_RANGE',
  'TSID_EPOCH_INVALID',
  'TSID_INVALID_CHAR',
  'TSID_INVALID_LENGTH',
  'TSID_LEADING_CHAR_OUT_OF_RANGE',
  'TSID_NODE_BITS_OUT_OF_RANGE',
  'TSID_NODE_OUT_OF_RANGE',
  'TSID_TIMESTAMP_INVALID',
  'TSID_TIMESTAMP_OUT_OF_RANGE',
  'TSID_VALUE_OUT_OF_RANGE',
  'TYPEID_INVALID_FORMAT',
  'TYPEID_PREFIX_INVALID_BOUNDARY',
  'TYPEID_PREFIX_INVALID_CHARACTER',
  'TYPEID_PREFIX_TOO_LONG',
  'TYPEID_SUFFIX_INVALID_CHARACTER',
  'TYPEID_SUFFIX_INVALID_LENGTH',
  'TYPEID_SUFFIX_OVERFLOW',
  'TYPEID_UUID_BYTES_INVALID_LENGTH',
  'TYPEID_UUID_NOT_V7',
  'ULID_BUFFER_OUT_OF_BOUNDS',
  'ULID_BYTES_INVALID_LENGTH',
  'ULID_INVALID_CHAR',
  'ULID_INVALID_LENGTH',
  'ULID_RANDOM_BYTES_TOO_SHORT',
  'ULID_RANDOM_OVERFLOW',
  'ULID_TIMESTAMP_OUT_OF_RANGE',
  'ULID_TIMESTAMP_OVERFLOW',
  'UUID_BUFFER_OUT_OF_BOUNDS',
  'UUID_BYTES_INVALID_LENGTH',
  'UUID_INVALID_HEX_CHAR',
  'UUID_INVALID_LENGTH',
  'UUID_INVALID_SEPARATORS',
  'UUID_RANDOM_BYTES_TOO_SHORT',
  'UUID_SEQUENCE_OUT_OF_RANGE',
  'UUID_TIMESTAMP_OUT_OF_RANGE',
  'XID_BUFFER_OUT_OF_BOUNDS',
  'XID_BYTES_INVALID_LENGTH',
  'XID_COUNTER_OUT_OF_RANGE',
  'XID_INVALID_CHAR',
  'XID_INVALID_LENGTH',
  'XID_MACHINE_ID_BYTES_TOO_SHORT',
  'XID_NON_CANONICAL',
  'XID_PROCESS_ID_OUT_OF_RANGE',
  'XID_TIMESTAMP_OUT_OF_RANGE',
] as const

const CODE_PATTERN = /`([A-Z][A-Z0-9_]+)`/g
const INLINE_LITERAL_PATTERN = /`([^`]+)`/g
const REPOSITORY_ROOT = resolve(import.meta.dirname, '../../../..')

function readDocsPage(relativePath: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8')
}

function betweenHeadings(document: string, start: string, end: string): string {
  const startIndex = document.indexOf(start)
  const endIndex = document.indexOf(end, startIndex + start.length)

  expect(startIndex).toBeGreaterThanOrEqual(0)
  expect(endIndex).toBeGreaterThan(startIndex)

  return document.slice(startIndex, endIndex)
}

function inlineCodes(cell: string): string[] {
  return [...cell.matchAll(CODE_PATTERN)].map((match) => match[1])
}

function inlineLiterals(cell: string): string[] {
  return [...cell.matchAll(INLINE_LITERAL_PATTERN)].map((match) => match[1])
}

describe('public error contract', () => {
  it('publishes the complete, duplicate-free v1 error catalog', () => {
    expect(ERROR_CODES).toEqual(EXPECTED_ERROR_METADATA.map(({ code }) => code))
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length)
    expectTypeOf<ErrorCode>().toEqualTypeOf<(typeof ERROR_CODES)[number]>()
  })

  it('types every public error constructor with ErrorCode', () => {
    const errors: ReadonlyArray<UniqueIdError> = [
      new InvalidInputError('LENGTH_OUT_OF_RANGE', 'bad length', { strategy: 'nanoid' }),
      new ParseError('INVALID_CHAR', 'bad character', { strategy: 'ulid' }),
      new BufferError('BUFFER_OUT_OF_BOUNDS', 'bad offset', { strategy: 'uuid' }),
    ]

    for (const error of errors) {
      expectTypeOf(error.code).toEqualTypeOf<ErrorCode>()
    }

    expectTypeOf<ConstructorParameters<typeof ParseError>[0]>().toEqualTypeOf<ErrorCode>()
    expectTypeOf<ConstructorParameters<typeof InvalidInputError>[0]>().toEqualTypeOf<ErrorCode>()
    expectTypeOf<'ULID_INVALID_CHAR'>().not.toMatchTypeOf<ErrorCode>()
    expectTypeOf<'NOT_A_UNIKU_CODE'>().not.toMatchTypeOf<ErrorCode>()
  })

  it('keeps the public reference catalog in sync with ERROR_CODES', () => {
    const page = readDocsPage('apps/docs/content/docs/reference/errors.mdx')
    const section = betweenHeadings(page, '## Error code catalog', '## Generator list')
    const documentedMetadata = section
      .split('\n')
      .filter((line) => line.startsWith('| `'))
      .map((line) => {
        const cells = line.split('|')
        const codes = inlineCodes(cells[1])
        expect(codes).toHaveLength(1)

        return {
          code: codes[0],
          classes: inlineLiterals(cells[2]),
          strategies: inlineLiterals(cells[3]),
        }
      })

    expect(documentedMetadata).toEqual(EXPECTED_ERROR_METADATA)
  })

  it('maps every 0.4.3 error code exactly once to a v1 catalog code', () => {
    const page = readDocsPage('apps/docs/content/docs/migration/v1.mdx')
    const section = betweenHeadings(page, '## Update error-code matches', '## What remains stable')
    const rows = section.split('\n').filter((line) => line.startsWith('| `'))
    const migration = new Map<string, string>()
    const duplicatePreV1Codes: string[] = []
    const invalidTargets: string[] = []

    for (const row of rows) {
      const cells = row.split('|')
      const preV1Codes = inlineCodes(cells[1])
      const targets = inlineCodes(cells[2])

      expect(targets).toHaveLength(1)
      const target = targets[0]
      if (!ERROR_CODES.includes(target as ErrorCode)) {
        invalidTargets.push(target)
      }

      for (const preV1Code of preV1Codes) {
        if (migration.has(preV1Code)) {
          duplicatePreV1Codes.push(preV1Code)
        }
        migration.set(preV1Code, target)
      }
    }

    expect(duplicatePreV1Codes).toEqual([])
    expect(invalidTargets).toEqual([])
    expect([...migration.keys()].sort()).toEqual([...PRE_V1_ERROR_CODES].sort())
  })
})
