import { writeTimestamp32 } from '../common/bytes'
import { rng } from '../common/random'
import { resolveTimestampSecs } from '../common/timestamp'
import { isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { decodeBase62, encodeBase62 } from './base62'

/**
 * KSUID (K-Sortable Unique Identifier)
 *
 * A 160-bit identifier consisting of:
 * - 4 bytes: timestamp (seconds since KSUID epoch: May 13, 2014)
 * - 16 bytes: cryptographically random payload
 *
 * Encoded as a 27-character Base62 string.
 */

// KSUID epoch: May 13, 2014 00:00:00 UTC (Unix timestamp in seconds)
const KSUID_EPOCH = 1400000000

const KSUID_BYTES = 20
const KSUID_STRING_LEN = 27
const TIMESTAMP_BYTES = 4
const PAYLOAD_BYTES = 16
const KSUID_MAX_SECS = KSUID_EPOCH + 0xffffffff
// 2^160 - 1 in Base62 ('aWgEPTl1tmebfsQzFP4bxwgy80V'), derived from the
// encoder so it cannot drift from the decoder's 160-bit overflow bound.
const KSUID_MAX_STRING = encodeBase62(new Uint8Array(KSUID_BYTES).fill(0xff))

// Validation regex: 27 alphanumeric characters
// Note: Both cases are valid Base62 characters, but they decode to different values
// (e.g., 'A' = 10, 'a' = 36). The regex validates format, not semantic equivalence.
const KSUID_REGEX = /^[0-9A-Za-z]{27}$/

export type KsuidOptions = {
  /**
   * 16 bytes of random data to use for KSUID payload.
   */
  random?: Uint8Array
  /**
   * Timestamp in milliseconds since the Unix epoch.
   * Defaults to Date.now().
   * KSUID stores whole seconds, so sub-second precision is truncated.
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

export type Ksuid = {
  /** Generate a time-ordered KSUID string. */
  (): string
  /** Generate a KSUID with explicit options or write its 20 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(options: KsuidOptions | undefined, buf: TBuf, offset?: number): TBuf
  /** Generate a KSUID string with optional timestamp or random payload bytes. */
  (options?: KsuidOptions, buf?: undefined, offset?: number): string
  /** Convert a KSUID string to its canonical 20-byte representation. */
  toBytes(id: string): Uint8Array
  /** Convert 20 canonical KSUID bytes to a KSUID string. */
  fromBytes(bytes: Uint8Array): string
  /** Read the embedded Unix timestamp in milliseconds. */
  timestamp(id: string): number
  /** Return whether a value is a syntactically valid KSUID string. */
  isValid(id: unknown): id is string
  /** The nil KSUID (all zeros) */
  NIL: string
  /** The max KSUID (maximum valid value) */
  MAX: string
}

/**
 * Write already-validated KSUID fields to a buffer.
 */
function writeKsuidBytesUnchecked(timestamp: number, payload: Uint8Array, buf: Uint8Array, offset: number): void {
  // Timestamp (32-bit big-endian seconds since KSUID epoch) -> bytes 0-3
  writeTimestamp32(buf, offset, timestamp)

  // Payload (128 bits) -> bytes 4-19
  for (let i = 0; i < PAYLOAD_BYTES; i += 1) {
    buf[offset + TIMESTAMP_BYTES + i] = payload[i]
  }
}

/*
 * Overload: no buffer => return a KSUID string.
 */
function ksuidFn(options?: KsuidOptions, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with KSUID bytes.
 */
function ksuidFn<TBuf extends Uint8Array = Uint8Array>(
  options: KsuidOptions | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function ksuidFn<TBuf extends Uint8Array = Uint8Array>(options?: KsuidOptions, buf?: TBuf, offset = 0): string | TBuf {
  const random = options?.random
  if (random && random.length < PAYLOAD_BYTES) {
    throw new InvalidInputError('RANDOM_BYTES_TOO_SHORT', 'Random bytes length must be >= 16 for KSUID', {
      strategy: 'ksuid',
    })
  }

  let timestamp: number
  const secs = options === undefined ? undefined : resolveTimestampSecs(options, KSUID_EPOCH, KSUID_MAX_SECS, 'ksuid')
  if (secs !== undefined) {
    timestamp = secs - KSUID_EPOCH
  } else {
    /**
     * Note: by default, Cloudflare Workers "freezes" time during request handling to prevent
     * side-channel attacks. This means that Date.now() will return the same value for the entire
     * duration of a request.
     * Implications:
     * - all KSUIDs generated within a single request will have the same timestamp.
     */
    timestamp = Math.floor(Date.now() / 1000) - KSUID_EPOCH
  }

  const payload = random ?? rng()

  if (buf) {
    if (!isWritableRange(buf, offset, KSUID_BYTES)) {
      throw new BufferError(
        'BUFFER_OUT_OF_BOUNDS',
        `KSUID byte range ${offset}:${offset + KSUID_BYTES - 1} is out of buffer bounds`,
        { strategy: 'ksuid' },
      )
    }
    writeKsuidBytesUnchecked(timestamp, payload, buf, offset)
    return buf
  }

  const bytes = new Uint8Array(KSUID_BYTES)
  writeKsuidBytesUnchecked(timestamp, payload, bytes, 0)

  // String mode: create bytes then encode to Base62
  return encodeBase62(bytes)
}

/**
 * Convert a KSUID string to 20 bytes.
 *
 * Note: Base62 is case-sensitive. 'A' (value 10) and 'a' (value 36) decode
 * to different byte values. This function accepts both cases as valid input.
 */
function toBytes(id: string): Uint8Array {
  return decodeBase62(id)
}

/**
 * Convert 20 bytes to a KSUID string.
 */
function fromBytes(bytes: Uint8Array): string {
  if (bytes.length !== KSUID_BYTES) {
    throw new BufferError(
      'BYTES_INVALID_LENGTH',
      `KSUID bytes must be exactly ${KSUID_BYTES} bytes, got ${bytes.length}`,
      { strategy: 'ksuid' },
    )
  }
  return encodeBase62(bytes)
}

/**
 * Extract the timestamp from a KSUID string.
 * Returns Unix timestamp in milliseconds for API consistency with ulid/uuidv7.
 * Note: KSUID only has second precision, so the returned value will always end in 000.
 */
function timestamp(id: string): number {
  const bytes = decodeBase62(id)
  // First 4 bytes are big-endian timestamp (seconds since KSUID epoch)
  const secs = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  // Add KSUID epoch and convert to milliseconds
  return (secs + KSUID_EPOCH) * 1000
}

/**
 * Validate a KSUID string format and 160-bit numeric range.
 */
function isValid(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length === KSUID_STRING_LEN &&
    KSUID_REGEX.test(id) &&
    // Fixed-length Base62 strings preserve numeric order because the alphabet is ASCII-sorted.
    id <= KSUID_MAX_STRING
  )
}

/**
 * Generate a KSUID string or write the bytes into a buffer.
 * Also includes helpers to convert to and from byte arrays.
 */
export const ksuid: Ksuid = Object.assign(ksuidFn, {
  toBytes,
  fromBytes,
  timestamp,
  isValid,
  NIL: '000000000000000000000000000',
  MAX: KSUID_MAX_STRING,
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
