import { writeTimestamp32 } from '../common/bytes'
import { rng } from '../common/random'
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
   * Timestamp in seconds since Unix epoch.
   * Defaults to Math.floor(Date.now() / 1000).
   * KSUID natively uses second precision.
   */
  secs?: number
}

export type Ksuid = {
  (): string
  <TBuf extends Uint8Array = Uint8Array>(options: KsuidOptions | undefined, buf: TBuf, offset?: number): TBuf
  (options?: KsuidOptions, buf?: undefined, offset?: number): string
  toBytes(id: string): Uint8Array
  fromBytes(bytes: Uint8Array): string
  timestamp(id: string): number
  isValid(id: unknown): id is string
  /** The nil KSUID (all zeros) */
  NIL: string
  /** The max KSUID (maximum valid value) */
  MAX: string
}

/**
 * Write KSUID bytes to a buffer.
 */
function ksuidBytes(timestamp: number, payload: Uint8Array, buf?: Uint8Array, offset = 0): Uint8Array {
  if (!buf) {
    buf = new Uint8Array(KSUID_BYTES)
    offset = 0
  } else if (offset < 0 || offset + KSUID_BYTES > buf.length) {
    throw new BufferError(
      'KSUID_BUFFER_OUT_OF_BOUNDS',
      `KSUID byte range ${offset}:${offset + KSUID_BYTES - 1} is out of buffer bounds`,
    )
  }

  // Timestamp (32-bit big-endian seconds since KSUID epoch) -> bytes 0-3
  writeTimestamp32(buf, offset, timestamp)

  // Payload (128 bits) -> bytes 4-19
  for (let i = 0; i < PAYLOAD_BYTES; i += 1) {
    buf[offset + TIMESTAMP_BYTES + i] = payload[i]
  }

  return buf
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
    throw new InvalidInputError('KSUID_RANDOM_BYTES_TOO_SHORT', 'Random bytes length must be >= 16 for KSUID')
  }

  let timestamp: number
  const secs = options?.secs
  if (secs !== undefined) {
    if (!Number.isInteger(secs) || secs < KSUID_EPOCH) {
      throw new InvalidInputError('KSUID_TIMESTAMP_TOO_LOW', 'Timestamp must be >= KSUID epoch')
    }

    if (secs > KSUID_MAX_SECS) {
      throw new InvalidInputError('KSUID_TIMESTAMP_TOO_HIGH', 'Timestamp must be <= maximum KSUID timestamp')
    }

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
    ksuidBytes(timestamp, payload, buf, offset)
    return buf
  }

  const bytes = ksuidBytes(timestamp, payload)

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
