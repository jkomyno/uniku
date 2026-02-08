import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { ulid } from 'uniku/ulid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type UlidGenerateOptions = {
  readonly count: number
  readonly monotonic: boolean
  readonly timestamp?: number
  readonly lowercase: boolean
}

export function generateUlid(options: UlidGenerateOptions): Effect.Effect<string[], CliError> {
  if (options.monotonic && options.timestamp != null) {
    return Effect.fail(
      new CliError(
        'INVALID_OPTIONS',
        '--monotonic and --timestamp are mutually exclusive',
        'Use --monotonic for monotonically increasing ULIDs, or --timestamp to specify a fixed timestamp',
      ),
    )
  }

  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        const ulidOpts = options.timestamp != null ? { msecs: options.timestamp } : undefined
        let id = ulid(ulidOpts)
        if (options.lowercase) {
          id = id.toLowerCase()
        }
        ids.push(id)
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError('GENERATE_FAILED', String(err))
    },
  })
}
