import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { CliError } from '@/src/domain/errors'

const parseTimestampMs = Effect.fn('cli.generate.parseTimestamp')(function* (input: string) {
  if (input === 'now') {
    return yield* Clock.currentTimeMillis
  }
  const n = Number(input)
  if (!Number.isFinite(n) || n < 0) {
    return yield* new CliError({
      code: 'INVALID_TIMESTAMP',
      message: `Invalid timestamp: "${input}"`,
      hint: 'Provide a Unix timestamp in milliseconds or "now"',
    })
  }
  return n
})

const parseNonNegativeInt = Effect.fn('cli.generate.parseNonNegativeInt')(function* (
  input: string,
  code: string,
  label: string,
  hint: string,
) {
  const n = Number(input)
  if (!Number.isInteger(n) || n < 0) {
    return yield* new CliError({ code, message: `Invalid ${label}: "${input}"`, hint })
  }
  return n
})

const parseOptional =
  (parse: (input: string) => Effect.Effect<number, CliError>) =>
  (input: Option.Option<string>): Effect.Effect<number | undefined, CliError> =>
    Option.match(input, { onNone: () => Effect.succeed(undefined), onSome: parse })

export const parseOptionalTimestampMs = parseOptional(parseTimestampMs)

export const parseOptionalNode = parseOptional((input) =>
  parseNonNegativeInt(input, 'INVALID_NODE', 'node', 'Provide a non-negative integer for --node'),
)

export const parseOptionalNodeBits = parseOptional((input) =>
  parseNonNegativeInt(input, 'INVALID_NODE_BITS', 'node-bits', 'Provide a non-negative integer (0-20) for --node-bits'),
)
