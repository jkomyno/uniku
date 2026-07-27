import { InvalidInputError } from '../errors'
import type { IdGenerator } from '../generators'
import { isIntegerInRange } from './validation'

/**
 * Timestamp options accepted by second-precision generators (ksuid, objectid,
 * xid).
 */
export type TimestampOptions = {
  /**
   * Timestamp in milliseconds since the Unix epoch.
   * The generator stores whole seconds, so sub-second precision is truncated.
   */
  msecs?: number
}

/**
 * Resolve a caller-provided millisecond timestamp to whole seconds since the
 * Unix epoch, or `undefined` when no timestamp was supplied.
 */
export function resolveTimestampSecs(
  options: TimestampOptions,
  minSecs: number,
  maxSecs: number,
  strategy: IdGenerator,
): number | undefined {
  const { msecs } = options

  if (msecs !== undefined) {
    const minMsecs = minSecs * 1000
    const maxMsecs = maxSecs * 1000 + 999
    if (!isIntegerInRange(msecs, minMsecs, maxMsecs)) {
      throw new InvalidInputError(
        'TIMESTAMP_OUT_OF_RANGE',
        `Timestamp must be an integer between ${minMsecs} and ${maxMsecs} milliseconds`,
        { strategy },
      )
    }
    return Math.floor(msecs / 1000)
  }

  return undefined
}
