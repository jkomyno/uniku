import { Command, Options } from '@effect/cli'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { COUNT_DEFAULT, CUID_LENGTH_DEFAULT, NANOID_SIZE_DEFAULT, UUID_VERSION_DEFAULT } from '@/src/domain/constants'
import { CliError } from '@/src/domain/errors'
import { generateCuid } from '@/src/generators/cuid'
import { generateKsuid } from '@/src/generators/ksuid'
import { generateNanoid } from '@/src/generators/nanoid'
import { generateUlid } from '@/src/generators/ulid'
import { generateUuid } from '@/src/generators/uuid'
import { OutputService } from '@/src/services/OutputService'

// ── Common options ──────────────────────────────────────────────────

const countOption = Options.integer('count').pipe(
  Options.withAlias('n'),
  Options.withDescription('Number of IDs to generate'),
  Options.withDefault(COUNT_DEFAULT),
)

const jsonOption = Options.boolean('json').pipe(Options.withDescription('Output as JSON'), Options.withDefault(false))

// ── UUID subcommand ─────────────────────────────────────────────────

const uuidVersionOption = Options.choiceWithValue('uuid-version', [
  ['4', 4],
  ['7', 7],
] as const).pipe(
  Options.withAlias('v'),
  Options.withDescription('UUID version: 4, 7'),
  Options.withDefault(UUID_VERSION_DEFAULT as 4 | 7),
)

const lowercaseOption = Options.boolean('lowercase').pipe(
  Options.withDescription('Output in lowercase'),
  Options.withDefault(false),
)

const uuidSubcommand = Command.make(
  'uuid',
  {
    count: countOption,
    json: jsonOption,
    version: uuidVersionOption,
    lowercase: lowercaseOption,
  },
  ({ count, json, version, lowercase }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const ids = yield* generateUuid({ count, version, lowercase })
      yield* output.writeIds(ids, { json })
    }),
).pipe(Command.withDescription('Generate UUIDs (v4 or v7)'))

// ── ULID subcommand ─────────────────────────────────────────────────

const monotonicOption = Options.boolean('monotonic').pipe(
  Options.withDescription('Generate monotonically increasing ULIDs'),
  Options.withDefault(false),
)

const ulidTimestampOption = Options.text('timestamp').pipe(
  Options.withDescription('Unix timestamp in milliseconds (or "now")'),
  Options.optional,
)

const ulidSubcommand = Command.make(
  'ulid',
  {
    count: countOption,
    json: jsonOption,
    monotonic: monotonicOption,
    timestamp: ulidTimestampOption,
    lowercase: lowercaseOption,
  },
  ({ count, json, monotonic, timestamp: timestampOpt, lowercase }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const timestamp = Option.isSome(timestampOpt) ? parseTimestampMs(Option.getOrThrow(timestampOpt)) : undefined
      const ids = yield* generateUlid({ count, monotonic, timestamp, lowercase })
      yield* output.writeIds(ids, { json })
    }),
).pipe(Command.withDescription('Generate ULIDs'))

// ── Nanoid subcommand ───────────────────────────────────────────────

const sizeOption = Options.integer('size').pipe(
  Options.withAlias('s'),
  Options.withDescription('Length of ID (1-256)'),
  Options.withDefault(NANOID_SIZE_DEFAULT),
)

const alphabetOption = Options.text('alphabet').pipe(
  Options.withAlias('a'),
  Options.withDescription('Custom alphabet or preset: hex, numeric, alpha'),
  Options.optional,
)

const nanoidSubcommand = Command.make(
  'nanoid',
  {
    count: countOption,
    json: jsonOption,
    size: sizeOption,
    alphabet: alphabetOption,
  },
  ({ count, json, size, alphabet: alphabetOpt }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const alphabet = Option.isSome(alphabetOpt) ? Option.getOrThrow(alphabetOpt) : undefined
      const ids = yield* generateNanoid({ count, size, alphabet })
      yield* output.writeIds(ids, { json })
    }),
).pipe(Command.withDescription('Generate Nanoids'))

// ── CUID subcommand ─────────────────────────────────────────────────

const lengthOption = Options.integer('length').pipe(
  Options.withAlias('l'),
  Options.withDescription('Length of ID (2-32)'),
  Options.withDefault(CUID_LENGTH_DEFAULT),
)

const cuidSubcommand = Command.make(
  'cuid',
  {
    count: countOption,
    json: jsonOption,
    length: lengthOption,
  },
  ({ count, json, length }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const ids = yield* generateCuid({ count, length })
      yield* output.writeIds(ids, { json })
    }),
).pipe(Command.withDescription('Generate CUIDs (v2)'))

// ── KSUID subcommand ────────────────────────────────────────────────

const ksuidTimestampOption = Options.text('timestamp').pipe(
  Options.withDescription('Unix timestamp in seconds (or "now")'),
  Options.optional,
)

const ksuidSubcommand = Command.make(
  'ksuid',
  {
    count: countOption,
    json: jsonOption,
    timestamp: ksuidTimestampOption,
  },
  ({ count, json, timestamp: timestampOpt }) =>
    Effect.gen(function* () {
      const output = yield* OutputService
      const timestamp = Option.isSome(timestampOpt) ? parseTimestampSecs(Option.getOrThrow(timestampOpt)) : undefined
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

function parseTimestampMs(input: string): number {
  if (input === 'now') return Date.now()
  const n = Number(input)
  if (!Number.isFinite(n) || n < 0) {
    throw new CliError(
      'INVALID_TIMESTAMP',
      `Invalid timestamp: "${input}"`,
      'Provide a Unix timestamp in milliseconds or "now"',
    )
  }
  return n
}

function parseTimestampSecs(input: string): number {
  if (input === 'now') return Math.floor(Date.now() / 1000)
  const n = Number(input)
  if (!Number.isFinite(n) || n < 0) {
    throw new CliError(
      'INVALID_TIMESTAMP',
      `Invalid timestamp: "${input}"`,
      'Provide a Unix timestamp in seconds or "now"',
    )
  }
  return n
}
