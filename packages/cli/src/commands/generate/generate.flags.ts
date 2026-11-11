import { Flag } from 'effect/cli'
import { COUNT_DEFAULT } from '@/src/domain/constants'

export const countFlag = Flag.Int('count').pipe(
  Flag.withAlias('n'),
  Flag.withDescription('Number of IDs to generate'),
  Flag.filter(
    (count) => count >= 0,
    (count) => `Expected a non-negative integer, got ${count}`,
  ),
  Flag.withDefault(COUNT_DEFAULT),
)

export const jsonFlag = Flag.Boolean('json').pipe(Flag.withDescription('Output as JSON'), Flag.withDefault(false))

export const lowercaseFlag = Flag.Boolean('lowercase').pipe(
  Flag.withDescription('Output in lowercase'),
  Flag.withDefault(false),
)

export const timestampFlag = Flag.String('timestamp').pipe(
  Flag.withDescription('Unix timestamp in milliseconds (or "now")'),
  Flag.optional,
)
