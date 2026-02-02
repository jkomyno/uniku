import { rng } from './common/random'
import { formatUuid, parseUuid } from './common/uuid'

export type Version7Options = {
  /**
   * 16 bytes of random data to use for UUID generation.
   * Note: Several bytes will be overwritten with timestamp, version, and variant data.
   */
  random?: Uint8Array
  msecs?: number
  seq?: number
}

export type UuidV7 = {
  (): string
  <TBuf extends Uint8Array = Uint8Array>(options: Version7Options | undefined, buf: TBuf, offset?: number): TBuf
  (options?: Version7Options, buf?: undefined, offset?: number): string
  toBytes(id: string): Uint8Array
  fromBytes(bytes: Uint8Array): string
  isValid(id: string): boolean
}

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type V7State = {
  msecs?: number
  seq?: number
}

/**
 * Module-level state for maintaining monotonic ordering within the same millisecond.
 *
 * IMPORTANT: This state persists across all uuidv7() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 * - For isolated state, pass explicit `msecs` and `seq` via options.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: V7State = {}

function updateV7State(current: V7State, now: number, rnds: Uint8Array): V7State {
  // Initialize state on first call (-Infinity ensures any real timestamp is greater)
  current.msecs ??= -Infinity
  current.seq ??= 0

  if (now > current.msecs) {
    // New millisecond tick: reseed sequence from random bytes.
    current.seq = (rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]
    current.msecs = now
  } else {
    // Same millisecond: increment sequence, roll over into the next tick if needed.
    current.seq = (current.seq + 1) | 0
    if (current.seq === 0) {
      current.msecs += 1
    }
  }

  return current
}

function v7Bytes(rnds: Uint8Array, msecs?: number, seq?: number, buf?: Uint8Array, offset = 0): Uint8Array {
  if (rnds.length < 16) {
    throw new Error('Random bytes length must be >= 16')
  }

  if (!buf) {
    buf = new Uint8Array(16)
    offset = 0
  } else if (offset < 0 || offset + 16 > buf.length) {
    throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`)
  }

  msecs ??= Date.now()
  // Derive a 30-bit sequence if not provided by the caller.
  seq ??= ((rnds[6] * 0x7f) << 24) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]

  // Timestamp (48-bit big-endian milliseconds since Unix epoch).
  buf[offset++] = (msecs / 0x10000000000) & 0xff
  buf[offset++] = (msecs / 0x100000000) & 0xff
  buf[offset++] = (msecs / 0x1000000) & 0xff
  buf[offset++] = (msecs / 0x10000) & 0xff
  buf[offset++] = (msecs / 0x100) & 0xff
  buf[offset++] = msecs & 0xff

  // Set version (7) and variant (10xx), then pack sequence and random tail bytes.
  buf[offset++] = 0x70 | ((seq >>> 28) & 0x0f)
  buf[offset++] = (seq >>> 20) & 0xff
  buf[offset++] = 0x80 | ((seq >>> 14) & 0x3f)
  buf[offset++] = (seq >>> 6) & 0xff
  // Lower seq bits plus 2 random bits to complete the 128-bit payload.
  buf[offset++] = ((seq << 2) & 0xff) | (rnds[10] & 0x03)
  buf[offset++] = rnds[11]
  buf[offset++] = rnds[12]
  buf[offset++] = rnds[13]
  buf[offset++] = rnds[14]
  buf[offset++] = rnds[15]

  return buf
}

/*
 * Overload: no buffer => return a UUID string.
 */
function v7(options?: Version7Options, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with UUID bytes.
 */
function v7<TBuf extends Uint8Array = Uint8Array>(
  options: Version7Options | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function v7<TBuf extends Uint8Array = Uint8Array>(
  options?: Version7Options,
  buf?: TBuf,
  offset?: number,
): string | TBuf {
  let bytes: Uint8Array

  if (options) {
    bytes = v7Bytes(options.random ?? rng(), options.msecs, options.seq, buf, offset)
  } else {
    /**
     * Note: by default, Cloudflare Workers "freezes" time during request handling to prevent
     * side-channel attacks. This means that Date.now() will return the same value for the entire
     * duration of a request.
     * Implications:
     * - all UUIDv7 generated within a single request will have the same timestamp.
     * - the monotonic ordering will rely entirely on the `state.seq` counter
     */
    const now = Date.now()
    const rnds = rng()

    updateV7State(state, now, rnds)

    bytes = v7Bytes(rnds, state.msecs, state.seq, buf, offset)
  }

  return buf ?? formatUuid(bytes)
}

/**
 * Generate a UUID v7 string or write the bytes into a buffer.
 * It also includes helpers to convert to and from byte arrays.j
 */
export const uuidv7: UuidV7 = Object.assign(v7, {
  toBytes: (id: string) => parseUuid(id),
  fromBytes: (bytes: Uint8Array) => formatUuid(bytes),
  isValid: (id: string) => UUID_V7_REGEX.test(id),
})
