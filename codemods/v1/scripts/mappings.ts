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
