import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { Command, Flag } from 'effect/unstable/cli'
import { COUNT_DEFAULT, CUID_LENGTH_DEFAULT, NANOID_SIZE_DEFAULT, UUID_VERSION_DEFAULT } from '@/src/domain/constants'
import { CliError } from '@/src/domain/errors'
import { generateCuid } from '@/src/generators/cuid'
import { generateKsuid } from '@/src/generators/ksuid'
import { generateNanoid } from '@/src/generators/nanoid'
import { generateUlid } from '@/src/generators/ulid'
import { generateUuid } from '@/src/generators/uuid'
import { OutputService } from '@/src/services/OutputService'

// ── Common flags ────────────────────────────────────────────────────

const countFlag = Flag.integer('count').pipe(
  Flag.withAlias('n'),
  Flag.withDescription('Number of IDs to generate'),
  Flag.withDefault(COUNT_DEFAULT),
)

const jsonFlag = Flag.boolean('json').pipe(Flag.withDescription('Output as JSON'), Flag.withDefault(false))

// ── UUID subcommand ─────────────────────────────────────────────────

const uuidVersionFlag = Flag.choiceWithValue('uuid-version', [
  ['4', 4],
  ['7', 7],
] as const).pipe(
  Flag.withAlias('v'),
  Flag.withDescription('UUID version: 4, 7'),
  Flag.withDefault(UUID_VERSION_DEFAULT as 4 | 7),
)

const lowercaseFlag = Flag.boolean('lowercase').pipe(
  Flag.withDescription('Output in lowercase'),
  Flag.withDefault(false),
)

const uuidSubcommand = Command.make(
  'uuid',
  {
    count: countFlag,
    json: jsonFlag,
    version: uuidVersionFlag,
    lowercase: lowercaseFlag,
  },
  Effect.fn('cli.generate.uuid')(function* ({ count, json, version, lowercase }) {
    const output = yield* OutputService
    const ids = yield* generateUuid({ count, version, lowercase })
    yield* output.writeIds(ids, { json })
  }),
).pipe(Command.withDescription('Generate UUIDs (v4 or v7)'))

// ── ULID subcommand ─────────────────────────────────────────────────

const monotonicFlag = Flag.boolean('monotonic').pipe(
  Flag.withDescription('Generate monotonically increasing ULIDs'),
  Flag.withDefault(false),
)

const ulidTimestampFlag = Flag.string('timestamp').pipe(
  Flag.withDescription('Unix timestamp in milliseconds (or "now")'),
  Flag.optional,
)

const ulidSubcommand = Command.make(
  'ulid',
  {
    count: countFlag,
    json: jsonFlag,
    monotonic: monotonicFlag,
    timestamp: ulidTimestampFlag,
    lowercase: lowercaseFlag,
  },
  Effect.fn('cli.generate.ulid')(function* ({ count, json, monotonic, timestamp: timestampOpt, lowercase }) {
    const output = yield* OutputService
    const timestampInput = Option.getOrUndefined(timestampOpt)
    const timestamp = timestampInput !== undefined ? yield* parseTimestampMs(timestampInput) : undefined
    const ids = yield* generateUlid({ count, monotonic, timestamp, lowercase })
    yield* output.writeIds(ids, { json })
  }),
).pipe(Command.withDescription('Generate ULIDs'))

// ── Nanoid subcommand ───────────────────────────────────────────────

const sizeFlag = Flag.integer('size').pipe(
  Flag.withAlias('s'),
  Flag.withDescription('Length of ID (1-256)'),
  Flag.withDefault(NANOID_SIZE_DEFAULT),
)

const alphabetFlag = Flag.string('alphabet').pipe(
  Flag.withAlias('a'),
  Flag.withDescription('Custom alphabet or preset: hex, numeric, alpha'),
  Flag.optional,
)

const nanoidSubcommand = Command.make(
  'nanoid',
  {
    count: countFlag,
    json: jsonFlag,
    size: sizeFlag,
    alphabet: alphabetFlag,
  },
  Effect.fn('cli.generate.nanoid')(function* ({ count, json, size, alphabet: alphabetOpt }) {
    const output = yield* OutputService
    const alphabet = Option.getOrUndefined(alphabetOpt)
    const ids = yield* generateNanoid({ count, size, alphabet })
    yield* output.writeIds(ids, { json })
  }),
).pipe(Command.withDescription('Generate Nanoids'))

// ── CUID subcommand ─────────────────────────────────────────────────

const lengthFlag = Flag.integer('length').pipe(
  Flag.withAlias('l'),
  Flag.withDescription('Length of ID (2-32)'),
  Flag.withDefault(CUID_LENGTH_DEFAULT),
)

const cuidSubcommand = Command.make(
  'cuid',
  {
    count: countFlag,
    json: jsonFlag,
    length: lengthFlag,
  },
  Effect.fn('cli.generate.cuid')(function* ({ count, json, length }) {
    const output = yield* OutputService
    const ids = yield* generateCuid({ count, length })
    yield* output.writeIds(ids, { json })
  }),
).pipe(Command.withDescription('Generate CUIDs (v2)'))

// ── KSUID subcommand ────────────────────────────────────────────────

const ksuidTimestampFlag = Flag.string('timestamp').pipe(
  Flag.withDescription('Unix timestamp in seconds (or "now")'),
  Flag.optional,
)

const ksuidSubcommand = Command.make(
  'ksuid',
  {
    count: countFlag,
    json: jsonFlag,
    timestamp: ksuidTimestampFlag,
  },
  Effect.fn('cli.generate.ksuid')(function* ({ count, json, timestamp: timestampOpt }) {
    const output = yield* OutputService
    const timestampInput = Option.getOrUndefined(timestampOpt)
    const timestamp = timestampInput !== undefined ? yield* parseTimestampSecs(timestampInput) : undefined
    const ids = yield* generateKsuid({ count, timestamp })
    yield* output.writeIds(ids, { json })
  }),
).pipe(Command.withDescription('Generate KSUIDs'))

// ── Generate parent command ─────────────────────────────────────────

export const generateCommand = Command.make('generate').pipe(
  Command.withDescription('Generate new IDs'),
  Command.withSubcommands([uuidSubcommand, ulidSubcommand, nanoidSubcommand, cuidSubcommand, ksuidSubcommand]),
)

// ── Shorthand commands (top-level: `uniku uuid`, `uniku ulid`, etc.) ─

export const uuidShorthand = uuidSubcommand
export const ulidShorthand = ulidSubcommand
export const nanoidShorthand = nanoidSubcommand
export const cuidShorthand = cuidSubcommand
export const ksuidShorthand = ksuidSubcommand

// ── Helpers ─────────────────────────────────────────────────────────

const parseTimestamp = Effect.fn('cli.generate.parseTimestamp')(function* (
  input: string,
  fromMillis: (millis: number) => number,
  hint: string,
) {
  if (input === 'now') {
    return fromMillis(yield* Clock.currentTimeMillis)
  }
  const n = Number(input)
  if (!Number.isFinite(n) || n < 0) {
    return yield* new CliError({ code: 'INVALID_TIMESTAMP', message: `Invalid timestamp: "${input}"`, hint })
  }
  return n
})

const parseTimestampMs = (input: string): Effect.Effect<number, CliError> =>
  parseTimestamp(input, (millis) => millis, 'Provide a Unix timestamp in milliseconds or "now"')

const parseTimestampSecs = (input: string): Effect.Effect<number, CliError> =>
  parseTimestamp(input, (millis) => Math.floor(millis / 1000), 'Provide a Unix timestamp in seconds or "now"')
