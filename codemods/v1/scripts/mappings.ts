export const GUIDE_BASE_URL = 'https://jkomyno.github.io/uniku/docs/migration/v1/'

export const RULES = {
  cuid: {
    id: 'uniku-v1/cuid-entry-point',
    guideUrl: `${GUIDE_BASE_URL}#move-cuid-v2-to-the-versioned-entry-point`,
  },
  timestamp: {
    id: 'uniku-v1/timestamp-options',
    guideUrl: `${GUIDE_BASE_URL}#convert-second-based-timestamp-options-to-milliseconds`,
  },
  counter: {
    id: 'uniku-v1/counter-options',
    guideUrl: `${GUIDE_BASE_URL}#rename-uuid-v7-and-typeid-counters`,
  },
  nanoid: {
    id: 'uniku-v1/nanoid-length',
    guideUrl: `${GUIDE_BASE_URL}#rename-nanoids-object-form-length`,
  },
  error: {
    id: 'uniku-v1/error-codes',
    guideUrl: `${GUIDE_BASE_URL}#update-error-code-matches`,
  },
  overlap: {
    id: 'uniku-v1/edit-overlap',
    guideUrl: GUIDE_BASE_URL,
  },
} as const

export type MigrationRule = (typeof RULES)[keyof typeof RULES]
export type MigrationRuleId = MigrationRule['id']

export interface GeneratorMigration {
  readonly moduleName: string
  readonly exportName: string
  readonly optionIndex: number
  readonly sourceKey: 'secs' | 'seq' | 'size'
  readonly targetKey: 'msecs' | 'counter' | 'length'
  readonly multiplyByThousand: boolean
  readonly rule: MigrationRule
}

export const GENERATOR_MIGRATIONS = [
  {
    moduleName: 'uniku/uuid/v7',
    exportName: 'uuidv7',
    optionIndex: 0,
    sourceKey: 'seq',
    targetKey: 'counter',
    multiplyByThousand: false,
    rule: RULES.counter,
  },
  {
    moduleName: 'uniku/typeid',
    exportName: 'typeid',
    optionIndex: 1,
    sourceKey: 'seq',
    targetKey: 'counter',
    multiplyByThousand: false,
    rule: RULES.counter,
  },
  {
    moduleName: 'uniku/nanoid',
    exportName: 'nanoid',
    optionIndex: 0,
    sourceKey: 'size',
    targetKey: 'length',
    multiplyByThousand: false,
    rule: RULES.nanoid,
  },
  ...(['ksuid', 'objectid', 'xid'] as const).map(
    (name): GeneratorMigration => ({
      moduleName: `uniku/${name}`,
      exportName: name,
      optionIndex: 0,
      sourceKey: 'secs',
      targetKey: 'msecs',
      multiplyByThousand: true,
      rule: RULES.timestamp,
    }),
  ),
] as const satisfies readonly GeneratorMigration[]

export const GENERATOR_BY_MODULE = new Map(
  GENERATOR_MIGRATIONS.map((migration): readonly [string, GeneratorMigration] => [migration.moduleName, migration]),
)

export type ErrorStrategy = 'uuid' | 'ulid' | 'ksuid' | 'objectid' | 'xid' | 'tsid' | 'typeid' | 'nanoid' | 'cuid'

export interface ErrorCodeMigration {
  readonly sourceCode: string
  readonly targetCode: string
  readonly strategy: ErrorStrategy
}

const ERROR_CODE_GROUPS = [
  {
    targetCode: 'TIMESTAMP_OUT_OF_RANGE',
    sourceCodes: [
      'UUID_TIMESTAMP_OUT_OF_RANGE',
      'ULID_TIMESTAMP_OUT_OF_RANGE',
      'ULID_TIMESTAMP_OVERFLOW',
      'KSUID_TIMESTAMP_TOO_LOW',
      'KSUID_TIMESTAMP_TOO_HIGH',
      'OBJECTID_TIMESTAMP_OUT_OF_RANGE',
      'XID_TIMESTAMP_OUT_OF_RANGE',
      'TSID_TIMESTAMP_INVALID',
      'TSID_TIMESTAMP_OUT_OF_RANGE',
    ],
  },
  {
    targetCode: 'INVALID_CHAR',
    sourceCodes: [
      'UUID_INVALID_HEX_CHAR',
      'ULID_INVALID_CHAR',
      'KSUID_INVALID_CHAR',
      'OBJECTID_INVALID_CHAR',
      'XID_INVALID_CHAR',
      'TSID_INVALID_CHAR',
      'TYPEID_SUFFIX_INVALID_CHARACTER',
    ],
  },
  {
    targetCode: 'INVALID_LENGTH',
    sourceCodes: [
      'UUID_INVALID_LENGTH',
      'ULID_INVALID_LENGTH',
      'KSUID_INVALID_LENGTH',
      'OBJECTID_INVALID_LENGTH',
      'XID_INVALID_LENGTH',
      'TSID_INVALID_LENGTH',
      'TYPEID_SUFFIX_INVALID_LENGTH',
    ],
  },
  {
    targetCode: 'INVALID_FORMAT',
    sourceCodes: ['UUID_INVALID_SEPARATORS', 'TYPEID_INVALID_FORMAT'],
  },
  {
    targetCode: 'VALUE_OUT_OF_RANGE',
    sourceCodes: [
      'KSUID_OVERFLOW',
      'TYPEID_SUFFIX_OVERFLOW',
      'TSID_LEADING_CHAR_OUT_OF_RANGE',
      'TSID_VALUE_OUT_OF_RANGE',
    ],
  },
  { targetCode: 'NON_CANONICAL', sourceCodes: ['XID_NON_CANONICAL'] },
  {
    targetCode: 'BYTES_INVALID_LENGTH',
    sourceCodes: [
      'UUID_BYTES_INVALID_LENGTH',
      'ULID_BYTES_INVALID_LENGTH',
      'KSUID_BYTES_INVALID_LENGTH',
      'KSUID_BYTES_TOO_SHORT',
      'OBJECTID_BYTES_INVALID_LENGTH',
      'OBJECTID_BYTES_TOO_SHORT',
      'XID_BYTES_INVALID_LENGTH',
      'TSID_BYTES_INVALID_LENGTH',
      'TYPEID_UUID_BYTES_INVALID_LENGTH',
    ],
  },
  {
    targetCode: 'BUFFER_OUT_OF_BOUNDS',
    sourceCodes: [
      'UUID_BUFFER_OUT_OF_BOUNDS',
      'ULID_BUFFER_OUT_OF_BOUNDS',
      'KSUID_BUFFER_OUT_OF_BOUNDS',
      'OBJECTID_BUFFER_OUT_OF_BOUNDS',
      'XID_BUFFER_OUT_OF_BOUNDS',
      'TSID_BUFFER_OUT_OF_BOUNDS',
    ],
  },
  {
    targetCode: 'RANDOM_BYTES_TOO_SHORT',
    sourceCodes: [
      'UUID_RANDOM_BYTES_TOO_SHORT',
      'ULID_RANDOM_BYTES_TOO_SHORT',
      'KSUID_RANDOM_BYTES_TOO_SHORT',
      'OBJECTID_RANDOM_BYTES_TOO_SHORT',
      'NANOID_RANDOM_BYTES_INSUFFICIENT',
      'CUID2_RANDOM_BYTES_EMPTY',
    ],
  },
  { targetCode: 'RANDOM_OVERFLOW', sourceCodes: ['ULID_RANDOM_OVERFLOW'] },
  {
    targetCode: 'COUNTER_OUT_OF_RANGE',
    sourceCodes: [
      'UUID_SEQUENCE_OUT_OF_RANGE',
      'OBJECTID_COUNTER_OUT_OF_RANGE',
      'XID_COUNTER_OUT_OF_RANGE',
      'TSID_COUNTER_OUT_OF_RANGE',
    ],
  },
  { targetCode: 'NODE_OUT_OF_RANGE', sourceCodes: ['TSID_NODE_OUT_OF_RANGE'] },
  { targetCode: 'NODE_BITS_OUT_OF_RANGE', sourceCodes: ['TSID_NODE_BITS_OUT_OF_RANGE'] },
  { targetCode: 'EPOCH_INVALID', sourceCodes: ['TSID_EPOCH_INVALID'] },
  { targetCode: 'PROCESS_ID_OUT_OF_RANGE', sourceCodes: ['XID_PROCESS_ID_OUT_OF_RANGE'] },
  { targetCode: 'MACHINE_ID_BYTES_TOO_SHORT', sourceCodes: ['XID_MACHINE_ID_BYTES_TOO_SHORT'] },
  { targetCode: 'PREFIX_TOO_LONG', sourceCodes: ['TYPEID_PREFIX_TOO_LONG'] },
  { targetCode: 'PREFIX_INVALID_CHAR', sourceCodes: ['TYPEID_PREFIX_INVALID_CHARACTER'] },
  { targetCode: 'PREFIX_INVALID_BOUNDARY', sourceCodes: ['TYPEID_PREFIX_INVALID_BOUNDARY'] },
  { targetCode: 'UUID_NOT_V7', sourceCodes: ['TYPEID_UUID_NOT_V7'] },
  {
    targetCode: 'ALPHABET_OUT_OF_RANGE',
    sourceCodes: ['NANOID_ALPHABET_TOO_SHORT', 'NANOID_ALPHABET_TOO_LONG'],
  },
  { targetCode: 'ALPHABET_INVALID_CHAR', sourceCodes: ['NANOID_ALPHABET_INVALID_CHAR'] },
  { targetCode: 'ALPHABET_DUPLICATE', sourceCodes: ['NANOID_ALPHABET_DUPLICATE'] },
  {
    targetCode: 'LENGTH_OUT_OF_RANGE',
    sourceCodes: ['NANOID_SIZE_INVALID', 'NANOID_SIZE_TOO_LARGE', 'CUID2_LENGTH_OUT_OF_RANGE'],
  },
] as const

const strategyForLegacyCode = (sourceCode: string): ErrorStrategy => {
  const prefix = sourceCode.slice(0, sourceCode.indexOf('_'))
  switch (prefix) {
    case 'CUID2':
      return 'cuid'
    case 'UUID':
      return 'uuid'
    case 'ULID':
    case 'KSUID':
    case 'OBJECTID':
    case 'XID':
    case 'TSID':
    case 'TYPEID':
    case 'NANOID':
      return prefix.toLowerCase() as ErrorStrategy
    default:
      throw new Error(`Unknown legacy error-code prefix: ${prefix}`)
  }
}

export const ERROR_CODE_MIGRATIONS: readonly ErrorCodeMigration[] = ERROR_CODE_GROUPS.flatMap((group) =>
  group.sourceCodes.map((sourceCode) => ({
    sourceCode,
    targetCode: group.targetCode,
    strategy: strategyForLegacyCode(sourceCode),
  })),
)

export const ERROR_CODE_BY_SOURCE = new Map(
  ERROR_CODE_MIGRATIONS.map((migration): readonly [string, ErrorCodeMigration] => [migration.sourceCode, migration]),
)
