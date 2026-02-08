import { rng } from '../common/random'
import { formatUuid, parseUuid } from './common/uuid'

export type UuidV7Options = {
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
  <TBuf extends Uint8Array = Uint8Array>(options: UuidV7Options | undefined, buf: TBuf, offset?: number): TBuf
  (options?: UuidV7Options, buf?: undefined, offset?: number): string
  toBytes(id: string): Uint8Array
  fromBytes(bytes: Uint8Array): string
  timestamp(id: string): number
  isValid(id: unknown): id is string
  /** The nil UUID (all zeros) */
  NIL: string
  /** The max UUID (all ones) */
  MAX: string
}

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Reusable buffer for string output path - avoids allocation per call.
// Safe because bytes are consumed synchronously by formatUuid().
const reusableBuf = new Uint8Array(16)

type V7State = {
  msecs: number
  seq: number
}

/**
 * Module-level state for maintaining monotonic ordering within the same millisecond.
 *
 * IMPORTANT: This state persists across all uuidv7() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 * - For isolated state, pass explicit `msecs` and `seq` via options.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: V7State = { msecs: -Infinity, seq: 0 }

function v7Bytes(
  rnds: Uint8Array,
  msecs: number | undefined,
  seq: number | undefined,
  buf: Uint8Array,
  offset = 0,
): Uint8Array {
  if (rnds.length < 16) {
    throw new Error('Random bytes length must be >= 16')
  }

  if (offset < 0 || offset + 16 > buf.length) {
    throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`)
  }

  msecs ??= Date.now()
  // Derive a 31-bit sequence if not provided by the caller.
  // Uses same formula as hot path (line 130) for consistency.
  seq ??= (rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]

  // Timestamp (48-bit big-endian milliseconds since Unix epoch).
  // byte 0-5: timestamp (48 bits)
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
function v7(options?: UuidV7Options, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with UUID bytes.
 */
function v7<TBuf extends Uint8Array = Uint8Array>(options: UuidV7Options | undefined, buf: TBuf, offset?: number): TBuf
function v7<TBuf extends Uint8Array = Uint8Array>(options?: UuidV7Options, buf?: TBuf, offset?: number): string | TBuf {
  let bytes: Uint8Array

  if (options) {
    bytes = v7Bytes(options.random ?? rng(), options.msecs, options.seq, buf ?? reusableBuf, buf ? offset : 0)
  } else {
    // HOT PATH: Inline state management and byte generation for best performance
    const now = Date.now()
    const rnds = rng()

    // Update state (inlined for performance)
    if (now > state.msecs) {
      state.seq = (rnds[6] << 23) | (rnds[7] << 16) | (rnds[8] << 8) | rnds[9]
      state.msecs = now
    } else {
      state.seq = (state.seq + 1) | 0
      if (state.seq === 0) {
        state.msecs++
      }
    }

    bytes = v7Bytes(rnds, state.msecs, state.seq, buf ?? reusableBuf, buf ? offset : 0)
  }

  return buf ? (bytes as TBuf) : formatUuid(bytes)
}

function timestamp(id: string): number {
  const bytes = parseUuid(id)
  let msecs = 0
  for (let i = 0; i < 6; i += 1) {
    msecs = msecs * 256 + bytes[i]
  }
  return msecs
}

function isValid(id: unknown): id is string {
  return typeof id === 'string' && UUID_V7_REGEX.test(id)
}

/**
 * Generate a UUID v7 string or write the bytes into a buffer.
 *
 * UUID v7 is a time-ordered UUID that embeds a Unix timestamp in milliseconds,
 * making IDs naturally sortable by creation time. Ideal for database primary keys
 * where chronological ordering improves index performance.
 *
 * @example
 * ```ts
 * import { uuidv7 } from 'uniku/uuid/v7'
 *
 * const id = uuidv7()
 * // => "018e5e5c-7c8a-7000-8000-000000000000"
 *
 * // Extract timestamp
 * const ts = uuidv7.timestamp(id)
 * console.log(new Date(ts))
 *
 * // Validate
 * uuidv7.isValid(id) // true
 *
 * // Convert to/from bytes
 * const bytes = uuidv7.toBytes(id)
 * const restored = uuidv7.fromBytes(bytes)
 * ```
 */
export const uuidv7: UuidV7 = Object.assign(v7, {
  toBytes: parseUuid,
  fromBytes: formatUuid,
  timestamp,
  isValid,
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
})
