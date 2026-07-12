import { incrementBytesInPlace, writeTimestamp48 } from '../common/bytes'
import { rng } from '../common/random'
import { isIntegerInRange, isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { bytesToUlid, decodeToBytes, decodeUlidTime, encodeRandom, encodeTime } from './crockford'

export type UlidOptions = {
  /**
   * 16 bytes of random data to use for ULID generation.
   * Only the first 10 bytes are used.
   */
  random?: Uint8Array
  /**
   * Timestamp in milliseconds since Unix epoch.
   * Defaults to Date.now().
   */
  msecs?: number
}

export type Ulid = {
  /** Generate a time-ordered ULID string. */
  (): string
  /** Generate a ULID with explicit options or write its 16 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(options: UlidOptions | undefined, buf: TBuf, offset?: number): TBuf
  /** Generate a ULID string with optional timestamp or random bytes. */
  (options?: UlidOptions, buf?: undefined, offset?: number): string
  /** Convert a ULID string to its canonical 16-byte representation. */
  toBytes(id: string): Uint8Array
  /** Convert 16 canonical ULID bytes to a ULID string. */
  fromBytes(bytes: Uint8Array): string
  /** Read the embedded Unix timestamp in milliseconds. */
  timestamp(id: string): number
  /** Return whether a value is a syntactically valid ULID string. */
  isValid(id: unknown): id is string
  /** The nil ULID (all zeros) */
  NIL: string
  /** The max ULID (maximum valid value) */
  MAX: string
}

// Validation regex: first char [0-7] to prevent overflow, rest from Crockford alphabet
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i
const ULID_BYTES = 16
const RANDOM_BYTES = 10
const MAX_MSECS = 0xffffffffffff

type UlidState = {
  msecs: number
  lastRandom: Uint8Array
}

/**
 * Module-level state for maintaining monotonic ordering within the same millisecond.
 *
 * IMPORTANT: This state persists across all ulid() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 * - For isolated state, pass explicit `msecs` and `random` via options.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: UlidState = {
  msecs: -Infinity,
  lastRandom: new Uint8Array(RANDOM_BYTES),
}

function writeUlidBytesUnchecked(time: number, random: Uint8Array, buf: Uint8Array, offset: number): void {
  // Timestamp (48-bit big-endian milliseconds since Unix epoch) -> bytes 0-5
  writeTimestamp48(buf, offset, time)

  // Random (80 bits) -> bytes 6-15
  for (let i = 0; i < RANDOM_BYTES; i += 1) {
    buf[offset + 6 + i] = random[i]
  }
}

function writeUlidBytes(time: number, random: Uint8Array, buf: Uint8Array, offset: number): void {
  if (!isWritableRange(buf, offset, ULID_BYTES)) {
    throw new BufferError(
      'ULID_BUFFER_OUT_OF_BOUNDS',
      `ULID byte range ${offset}:${offset + ULID_BYTES - 1} is out of buffer bounds`,
    )
  }
  writeUlidBytesUnchecked(time, random, buf, offset)
}

/*
 * Overload: no buffer => return a ULID string.
 */
function ulidFn(options?: UlidOptions, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with ULID bytes.
 */
function ulidFn<TBuf extends Uint8Array = Uint8Array>(
  options: UlidOptions | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function ulidFn<TBuf extends Uint8Array = Uint8Array>(options?: UlidOptions, buf?: TBuf, offset = 0): string | TBuf {
  let time: number
  let random: Uint8Array

  /**
   * Note: by default, Cloudflare Workers "freezes" time during request handling to prevent
   * side-channel attacks. This means that Date.now() will return the same value for the entire
   * duration of a request.
   * Implications:
   * - all ULIDs generated within a single request will have the same timestamp.
   * - the monotonic ordering will rely entirely on incrementing the random portion.
   */
  if (options) {
    // Explicit options provided - use them directly without monotonic state
    const optMsecs = options.msecs
    if (optMsecs !== undefined && !isIntegerInRange(optMsecs, 0, MAX_MSECS)) {
      throw new InvalidInputError(
        'ULID_TIMESTAMP_OUT_OF_RANGE',
        `Timestamp must be an integer between 0 and ${MAX_MSECS}`,
      )
    }
    time = optMsecs ?? Date.now()
    const optRandom = options.random
    if (optRandom) {
      if (optRandom.length < RANDOM_BYTES) {
        throw new InvalidInputError(
          'ULID_RANDOM_BYTES_TOO_SHORT',
          `Random bytes length must be >= ${RANDOM_BYTES} for ULID`,
        )
      }
      random = optRandom
    } else {
      random = rng()
    }
  } else {
    time = Date.now()

    if (time > state.msecs) {
      // New millisecond: generate fresh random
      random = rng()
      state.msecs = time
      state.lastRandom.set(random.subarray(0, RANDOM_BYTES))
    } else {
      // Same millisecond or clock rollback: preserve last timestamp and increment random portion.
      time = state.msecs
      if (!incrementBytesInPlace(state.lastRandom)) {
        state.lastRandom.fill(0xff)
        throw new InvalidInputError(
          'ULID_RANDOM_OVERFLOW',
          'ULID random component overflowed while preserving monotonic order',
        )
      }
      random = state.lastRandom
    }
  }

  if (buf) {
    writeUlidBytes(time, random, buf, offset)
    return buf
  }

  // String mode: encode directly without buffer allocation
  return encodeTime(time) + encodeRandom(random)
}

/**
 * Generate a ULID string or write the bytes into a buffer.
 *
 * ULID (Universally Unique Lexicographically Sortable Identifier) is a 128-bit
 * identifier with millisecond timestamp precision and 80 bits of randomness.
 * ULIDs are URL-safe, use Crockford's Base32 encoding, and sort lexicographically
 * by creation time.
 *
 * @example
 * ```ts
 * import { ulid } from 'uniku/ulid'
 *
 * const id = ulid()
 * // => "01HW9T2W9W9YJ3JZ1H4P4M2T8Q"
 *
 * // Extract timestamp
 * const ts = ulid.timestamp(id)
 * console.log(new Date(ts))
 *
 * // Validate
 * ulid.isValid(id) // true
 *
 * // Convert to/from bytes (16 bytes)
 * const bytes = ulid.toBytes(id)
 * const restored = ulid.fromBytes(bytes)
 * ```
 */
function isValid(id: unknown): id is string {
  return typeof id === 'string' && ULID_REGEX.test(id)
}

/**
 * Generate a ULID string or write its 16 canonical bytes into a buffer.
 * ULIDs are URL-safe, carry a millisecond timestamp, and sort by creation time.
 */
export const ulid: Ulid = Object.assign(ulidFn, {
  toBytes: (id: string) => decodeToBytes(id),
  fromBytes: (bytes: Uint8Array) => bytesToUlid(bytes),
  timestamp: (id: string) => decodeUlidTime(id),
  isValid,
  NIL: '00000000000000000000000000',
  MAX: '7ZZZZZZZZZZZZZZZZZZZZZZZZZ',
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
