import { rng } from '../uuid/common/random'
import { decodeBase62, encodeBase62 } from './common/base62'

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

// Validation regex: 27 alphanumeric characters (case-insensitive)
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
  isValid(id: string): boolean
}

type KsuidState = {
  secs: number
  lastPayload: Uint8Array
}

/**
 * Module-level state for maintaining monotonic ordering within the same second.
 *
 * IMPORTANT: This state persists across all ksuid() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 * - For isolated state, pass explicit `msecs` and `random` via options.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: KsuidState = {
  secs: -Infinity,
  lastPayload: new Uint8Array(PAYLOAD_BYTES),
}

/**
 * Increment a 16-byte array by 1, propagating carry from LSB to MSB.
 * Returns a new array (does not modify input).
 */
function incrementPayload(bytes: Uint8Array): Uint8Array {
  const result = new Uint8Array(bytes)
  for (let i = result.length - 1; i >= 0; i -= 1) {
    if (result[i] < 255) {
      result[i] += 1
      return result
    }
    result[i] = 0
  }
  return result
}

/**
 * Write KSUID bytes to a buffer.
 */
function ksuidBytes(secs: number, payload: Uint8Array, buf?: Uint8Array, offset = 0): Uint8Array {
  if (!buf) {
    buf = new Uint8Array(KSUID_BYTES)
    offset = 0
  } else if (offset < 0 || offset + KSUID_BYTES > buf.length) {
    throw new RangeError(`KSUID byte range ${offset}:${offset + KSUID_BYTES - 1} is out of buffer bounds`)
  }

  // Timestamp (32-bit big-endian seconds since KSUID epoch) -> bytes 0-3
  buf[offset] = (secs >>> 24) & 0xff
  buf[offset + 1] = (secs >>> 16) & 0xff
  buf[offset + 2] = (secs >>> 8) & 0xff
  buf[offset + 3] = secs & 0xff

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
  let secs: number
  let payload: Uint8Array

  /**
   * Note: by default, Cloudflare Workers "freezes" time during request handling to prevent
   * side-channel attacks. This means that Date.now() will return the same value for the entire
   * duration of a request.
   * Implications:
   * - all KSUIDs generated within a single request will have the same timestamp.
   * - the monotonic ordering will rely entirely on incrementing the payload portion.
   */
  const now = Date.now()
  const defaultSecs = Math.floor(now / 1000) - KSUID_EPOCH

  if (options) {
    // Explicit options provided - use them directly without monotonic state
    secs = options.secs !== undefined ? options.secs - KSUID_EPOCH : defaultSecs

    if (options.random) {
      payload = options.random
    } else {
      payload = rng()
    }
  } else {
    secs = defaultSecs

    if (secs > state.secs) {
      // New second: generate fresh random payload
      payload = rng()
      state.secs = secs
      state.lastPayload.set(payload.subarray(0, PAYLOAD_BYTES))
    } else {
      // Same second: increment payload for monotonic ordering
      payload = incrementPayload(state.lastPayload)
      state.lastPayload = payload
    }
  }

  if (buf) {
    ksuidBytes(secs, payload, buf, offset)
    return buf
  }

  // String mode: create bytes then encode to Base62
  const bytes = ksuidBytes(secs, payload)
  return encodeBase62(bytes)
}

/**
 * Convert a KSUID string to 20 bytes.
 * Case-insensitive: accepts uppercase, lowercase, or mixed case.
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
 * Validate a KSUID string.
 * Case-insensitive: accepts uppercase, lowercase, or mixed case.
 */
function isValid(id: string): boolean {
  return typeof id === 'string' && id.length === KSUID_STRING_LEN && KSUID_REGEX.test(id)
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
})
