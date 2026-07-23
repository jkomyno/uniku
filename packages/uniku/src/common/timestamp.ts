import { InvalidInputError } from '../errors'
import type { IdGenerator } from '../generators'
import { isIntegerInRange } from './validation'

/**
 * Timestamp options accepted by second-precision generators (ksuid, objectid,
 * xid) during the pre-v1 transition to unified millisecond inputs.
 */
export type TimestampSecsOptions = {
  /**
   * Timestamp in milliseconds since the Unix epoch.
   * The generator stores whole seconds, so sub-second precision is truncated.
   */
  msecs?: number
  /**
   * Timestamp in seconds since the Unix epoch.
   *
   * @deprecated Use `msecs` instead. Will be removed at v1-rc.
   */
  // TODO(v1-rc): remove this alias (tracked in docs/STABILITY.md).
  secs?: number
}

/**
 * Resolve caller-provided timestamp options to whole seconds since the Unix
 * epoch, or `undefined` when neither option was supplied.
 *
 * `msecs` is the unified input and is truncated to whole seconds; `secs` is
 * the deprecated pre-v1 alias. Passing both is an error.
 *
 * TODO(v1-rc): drop the `secs` branch once the alias is removed.
 */
export function resolveTimestampSecs(
  options: TimestampSecsOptions,
  minSecs: number,
  maxSecs: number,
  strategy: IdGenerator,
): number | undefined {
  const { msecs, secs } = options

  if (msecs !== undefined && secs !== undefined) {
    throw new InvalidInputError('CONFLICTING_OPTIONS', 'Pass only one of `msecs` or `secs`, not both', { strategy })
  }

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

  if (secs !== undefined) {
    if (!isIntegerInRange(secs, minSecs, maxSecs)) {
      throw new InvalidInputError(
        'TIMESTAMP_OUT_OF_RANGE',
        `Timestamp must be an integer between ${minSecs} and ${maxSecs} seconds`,
        { strategy },
      )
    }
    return secs
  }

  return undefined
}
