import { writeTimestamp32 } from '../common/bytes'
import { randomBytes, randomUint32 } from '../common/random'
import { resolveTimestampSecs } from '../common/timestamp'
import { isIntegerInRange, isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { decodeObjectIdHex, encodeObjectIdHex } from './hex'

/**
 * MongoDB ObjectID
 *
 * A 96-bit (12-byte) identifier consisting of:
 * - 4 bytes: big-endian Unix timestamp in seconds
 * - 5 bytes: per-process random value
 * - 3 bytes: big-endian counter, always incrementing (wraps at 0xFFFFFF back to 0)
 *
 * Encoded as a 24-character lowercase hex string.
 */

const OBJECTID_BYTES = 12
const TIMESTAMP_BYTES = 4
const RANDOM_BYTES = 5
const COUNTER_BYTES = 3
const MAX_SECS = 0xffffffff
const MAX_COUNTER = 0xffffff

// Validation regex: case-insensitive per KTD7, matching bson's ObjectId.isValid()
const OBJECTID_REGEX = /^[0-9a-f]{24}$/i

export type ObjectIdOptions = {
  /**
   * 5 bytes of random data to use for the ObjectID's random field.
   */
  random?: Uint8Array
  /**
   * Timestamp in milliseconds since the Unix epoch.
   * Defaults to Date.now().
   * ObjectID stores whole seconds, so sub-second precision is truncated.
   */
  msecs?: number
  /**
   * Timestamp in seconds since the Unix epoch.
   *
   * @deprecated Use `msecs` instead. Will be removed at v1-rc.
   */
  // TODO(v1-rc): remove this alias (tracked in docs/STABILITY.md).
  secs?: number
  /**
   * 24-bit counter value (0 to 0xFFFFFF).
   */
  counter?: number
}

export type ObjectId = {
  /** Generate a MongoDB-compatible ObjectID string. */
  (): string
  /** Generate an ObjectID with explicit options or write its 12 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(options: ObjectIdOptions | undefined, buf: TBuf, offset?: number): TBuf
  /** Generate an ObjectID string with optional timestamp, random field, or counter. */
  (options?: ObjectIdOptions, buf?: undefined, offset?: number): string
  /** Convert an ObjectID string to its canonical 12-byte representation. */
  toBytes(id: string): Uint8Array
  /** Convert 12 canonical ObjectID bytes to an ObjectID string. */
  fromBytes(bytes: Uint8Array): string
  /** Read the embedded Unix timestamp in milliseconds. */
  timestamp(id: string): number
  /** Return whether a value is a syntactically valid ObjectID string. */
  isValid(id: unknown): id is string
  /** The nil ObjectID (all zeros) */
  NIL: string
  /** The max ObjectID (all 0xff) */
  MAX: string
}

type ObjectIdState = {
  random: Uint8Array | undefined
  counter: number | undefined
}

/**
 * Module-level state for the per-process random value and the always-incrementing counter.
 *
 * IMPORTANT: This state persists across all objectid() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 *   Unlike ULID/UUIDv7's per-timestamp sequence reset, the counter continuing to climb
 *   across warm starts is exactly the anti-collision behavior the ObjectID spec intends.
 * - For isolated state, pass explicit `random`, `msecs`, or `counter` via options.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: ObjectIdState = {
  random: undefined,
  counter: undefined,
}

/**
 * Draw 5 fresh random bytes into a newly-owned buffer, copying immediately so the
 * result is unaffected by any later pool refill triggered by other random draws
 * (e.g. the counter's `randomUint32()` call) before these bytes are consumed.
 */
function freshRandom(): Uint8Array {
  const bytes = new Uint8Array(RANDOM_BYTES)
  bytes.set(randomBytes(RANDOM_BYTES))
  return bytes
}

function writeObjectIdBytesUnchecked(
  secs: number,
  random: Uint8Array,
  counter: number,
  buf: Uint8Array,
  offset: number,
): void {
  // Timestamp (32-bit big-endian seconds since Unix epoch) -> bytes 0-3
  writeTimestamp32(buf, offset, secs)

  // Random (5 bytes) -> bytes 4-8
  for (let i = 0; i < RANDOM_BYTES; i += 1) {
    buf[offset + TIMESTAMP_BYTES + i] = random[i]
  }

  // Counter (24-bit big-endian) -> bytes 9-11
  buf[offset + TIMESTAMP_BYTES + RANDOM_BYTES] = (counter >>> 16) & 0xff
  buf[offset + TIMESTAMP_BYTES + RANDOM_BYTES + 1] = (counter >>> 8) & 0xff
  buf[offset + TIMESTAMP_BYTES + RANDOM_BYTES + COUNTER_BYTES - 1] = counter & 0xff
}

/*
 * Overload: no buffer => return an ObjectID string.
 */
function objectIdFn(options?: ObjectIdOptions, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with ObjectID bytes.
 */
function objectIdFn<TBuf extends Uint8Array = Uint8Array>(
  options: ObjectIdOptions | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function objectIdFn<TBuf extends Uint8Array = Uint8Array>(
  options?: ObjectIdOptions,
  buf?: TBuf,
  offset = 0,
): string | TBuf {
  let secs: number
  let random: Uint8Array
  let counter: number

  if (options) {
    const optRandom = options.random
    if (optRandom && optRandom.length < RANDOM_BYTES) {
      throw new InvalidInputError(
        'OBJECTID_RANDOM_BYTES_TOO_SHORT',
        `Random bytes length must be >= ${RANDOM_BYTES} for ObjectID`,
      )
    }

    const optSecs = resolveTimestampSecs(options, 0, MAX_SECS, 'objectid')

    const optCounter = options.counter
    if (optCounter !== undefined && !isIntegerInRange(optCounter, 0, MAX_COUNTER)) {
      throw new InvalidInputError('OBJECTID_COUNTER_OUT_OF_RANGE', `Counter must be between 0 and ${MAX_COUNTER}`)
    }

    // Options bypass persistent state entirely: every field is sourced fresh (given
    // value, or an independently-defaulted one), never read from or written to
    // `state` (see KTD2). This is what makes options-based generation deterministic
    // when all three fields are supplied.
    secs = optSecs ?? Math.floor(Date.now() / 1000)
    random = optRandom ?? freshRandom()
    counter = optCounter ?? randomUint32() & MAX_COUNTER
  } else {
    // Lazily initialize persistent state on first no-option call.
    if (state.random === undefined) {
      state.random = freshRandom()
    }
    if (state.counter === undefined) {
      state.counter = randomUint32() & MAX_COUNTER
    }

    /**
     * Note: by default, Cloudflare Workers "freezes" time during request handling to prevent
     * side-channel attacks. This means that Date.now() will return the same value for the entire
     * duration of a request.
     * Implications:
     * - all ObjectIDs generated within a single request will share the same timestamp.
     * - monotonic ordering relies entirely on the ever-incrementing counter.
     */
    secs = Math.floor(Date.now() / 1000)
    random = state.random
    state.counter = (state.counter + 1) & MAX_COUNTER
    counter = state.counter
  }

  if (buf) {
    if (!isWritableRange(buf, offset, OBJECTID_BYTES)) {
      throw new BufferError(
        'OBJECTID_BUFFER_OUT_OF_BOUNDS',
        `ObjectID byte range ${offset}:${offset + OBJECTID_BYTES - 1} is out of buffer bounds`,
      )
    }
    writeObjectIdBytesUnchecked(secs, random, counter, buf, offset)
    return buf
  }

  const bytes = new Uint8Array(OBJECTID_BYTES)
  writeObjectIdBytesUnchecked(secs, random, counter, bytes, 0)
  return encodeObjectIdHex(bytes)
}

/**
 * Convert an ObjectID hex string to 12 bytes.
 */
function toBytes(id: string): Uint8Array {
  return decodeObjectIdHex(id)
}

/**
 * Convert 12 bytes to an ObjectID hex string.
 */
function fromBytes(bytes: Uint8Array): string {
  if (bytes.length !== OBJECTID_BYTES) {
    throw new BufferError(
      'OBJECTID_BYTES_INVALID_LENGTH',
      `ObjectID bytes must be exactly ${OBJECTID_BYTES} bytes, got ${bytes.length}`,
    )
  }
  return encodeObjectIdHex(bytes)
}

/**
 * Extract the timestamp from an ObjectID string.
 * Returns Unix timestamp in milliseconds for API consistency with ulid/uuidv7/ksuid.
 * Note: ObjectID only has second precision, so the returned value will always end in 000.
 */
function timestamp(id: string): number {
  const bytes = decodeObjectIdHex(id)
  // First 4 bytes are big-endian timestamp (seconds since Unix epoch)
  const secs = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  return secs * 1000
}

/**
 * Validate an ObjectID string format.
 * Case-insensitive (KTD7), matching bson's ObjectId.isValid() and this repo's existing
 * convention (ulid, ksuid) of accepting mixed-case input for parsing, even though
 * generation always emits lowercase (matching MongoDB driver output).
 */
function isValid(id: unknown): id is string {
  return typeof id === 'string' && OBJECTID_REGEX.test(id)
}

/**
 * Generate a MongoDB ObjectID string or write the bytes into a buffer.
 *
 * ObjectID is a 12-byte identifier consisting of a 4-byte timestamp, a 5-byte
 * per-process random value, and a 3-byte always-incrementing counter, encoded
 * as a 24-character lowercase hex string. It is time-ordered and compatible
 * with MongoDB's own ObjectID implementation.
 *
 * @example
 * ```ts
 * import { objectid } from 'uniku/objectid'
 *
 * const id = objectid()
 * // => "667c3f2a1e2b3c4d5e6f7081"
 *
 * // Extract timestamp
 * const ts = objectid.timestamp(id)
 * console.log(new Date(ts))
 *
 * // Validate
 * objectid.isValid(id) // true
 *
 * // Convert to/from bytes (12 bytes)
 * const bytes = objectid.toBytes(id)
 * const restored = objectid.fromBytes(bytes)
 * ```
 */
export const objectid: ObjectId = Object.assign(objectIdFn, {
  toBytes,
  fromBytes,
  timestamp,
  isValid,
  NIL: '0'.repeat(24),
  MAX: 'f'.repeat(24),
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
