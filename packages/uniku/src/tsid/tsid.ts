import { randomUint32 } from '../common/random'
import { isIntegerInRange, isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { decodeTsidString, encodeTsidString } from './crockford64'

/**
 * TSID (Time-Sorted Unique Identifier)
 *
 * A 64-bit Snowflake-style identifier consisting of:
 * - 42 bits: millisecond timestamp relative to a custom epoch (default 2020-01-01T00:00:00.000Z)
 * - 10 bits: node ID (default; configurable via `nodeBits`)
 * - 12 bits: per-millisecond counter (default; `22 - nodeBits`)
 *
 * Unlike every other uniku generator, `tsid()` returns a `bigint` by default -
 * this is a deliberate design decision reflecting that TSID's value proposition
 * is native numeric storage (e.g. a database BIGINT primary key), not a
 * string-first identifier that happens to have a byte encoding. `toString`/
 * `fromString` are the boundary conversions to/from the 13-character canonical
 * Crockford Base32 string.
 *
 * Encoded as 8 big-endian bytes in buffer mode.
 */

const TSID_EPOCH = 1577836800000 // 2020-01-01T00:00:00.000Z
const TSID_BYTES = 8
const RANDOM_BITS = 22 // combined node + counter bits
const DEFAULT_NODE_BITS = 10
const DEFAULT_COUNTER_BITS = RANDOM_BITS - DEFAULT_NODE_BITS
const DEFAULT_NODE_MASK = (1 << DEFAULT_NODE_BITS) - 1
const DEFAULT_COUNTER_MASK = (1 << DEFAULT_COUNTER_BITS) - 1
const MAX_NODE_BITS = 20
const MAX_TIMESTAMP_DIFF = (1n << 42n) - 1n

export type TsidOptions = {
  /**
   * Timestamp in milliseconds since Unix epoch.
   * Defaults to Date.now().
   */
  msecs?: number
  /**
   * Custom epoch in milliseconds since Unix epoch.
   * Defaults to 1577836800000 (2020-01-01T00:00:00.000Z).
   */
  epoch?: number
  /**
   * Node ID (0 to 2^nodeBits - 1).
   * Defaults to a lazily-initialized, persistent random value.
   */
  node?: number
  /**
   * Number of bits allocated to the node ID (0-20).
   * The remaining bits (22 - nodeBits) are allocated to the counter.
   * Defaults to 10.
   */
  nodeBits?: number
  /**
   * Per-millisecond counter (0 to 2^(22 - nodeBits) - 1).
   * Defaults to a fresh random value on a new millisecond, or the previous
   * value incremented by 1 within the same millisecond.
   */
  counter?: number
}

export type Tsid = {
  (): bigint
  <TBuf extends Uint8Array = Uint8Array>(options: TsidOptions | undefined, buf: TBuf, offset?: number): TBuf
  (options?: TsidOptions, buf?: undefined, offset?: number): bigint
  toBytes(id: bigint): Uint8Array
  fromBytes(bytes: Uint8Array): bigint
  toString(id: bigint): string
  fromString(str: string): bigint
  timestamp(id: bigint, epoch?: number): number
  isValid(id: unknown): id is bigint
  /** The nil TSID (all zeros) */
  NIL: bigint
  /** The max TSID (maximum valid 64-bit value) */
  MAX: bigint
}

type TsidState = {
  node: number | undefined
  msecs: number
  counter: number
}

/**
 * Module-level state for the lazily-initialized persistent node ID and the
 * per-millisecond-reset counter.
 *
 * IMPORTANT: This state persists across all tsid() calls in the module's lifetime.
 * - In serverless/edge functions with warm starts, state persists between invocations.
 * - For isolated state, pass explicit `msecs`, `epoch`, `node`, `nodeBits`, or
 *   `counter` via options - doing so bypasses `state` entirely.
 * - Tests should mock Date.now() or provide explicit options for deterministic behavior.
 */
const state: TsidState = {
  node: undefined,
  msecs: -Infinity,
  counter: 0,
}

function pack(msecsDiff: bigint, node: number, counterBits: number, counter: number): bigint {
  return (msecsDiff << BigInt(RANDOM_BITS)) | (BigInt(node) << BigInt(counterBits)) | BigInt(counter)
}

function writeTsidBytesUnchecked(value: bigint, buf: Uint8Array, offset: number): void {
  for (let i = 0; i < TSID_BYTES; i += 1) {
    buf[offset + i] = Number((value >> BigInt((TSID_BYTES - 1 - i) * 8)) & 0xffn)
  }
}

type ResolvedTsidOptions = {
  msecsDiff: bigint
  node: number
  counterBits: number
  counter: number
}

function resolveTsidOptions(options: TsidOptions): ResolvedTsidOptions {
  const nodeBits = options.nodeBits ?? DEFAULT_NODE_BITS
  if (!isIntegerInRange(nodeBits, 0, MAX_NODE_BITS)) {
    throw new InvalidInputError('TSID_NODE_BITS_OUT_OF_RANGE', `nodeBits must be between 0 and ${MAX_NODE_BITS}`)
  }

  const counterBits = RANDOM_BITS - nodeBits
  const nodeMask = (1 << nodeBits) - 1
  const counterMask = (1 << counterBits) - 1
  const optNode = options.node
  if (optNode !== undefined && !isIntegerInRange(optNode, 0, nodeMask)) {
    throw new InvalidInputError('TSID_NODE_OUT_OF_RANGE', `node must be between 0 and ${nodeMask}`)
  }

  const optCounter = options.counter
  if (optCounter !== undefined && !isIntegerInRange(optCounter, 0, counterMask)) {
    throw new InvalidInputError('TSID_COUNTER_OUT_OF_RANGE', `counter must be between 0 and ${counterMask}`)
  }

  const epoch = options.epoch ?? TSID_EPOCH
  if (!Number.isInteger(epoch)) {
    throw new InvalidInputError('TSID_EPOCH_INVALID', 'epoch must be a finite integer')
  }
  const msecs = options.msecs ?? Date.now()
  if (!Number.isInteger(msecs)) {
    throw new InvalidInputError('TSID_TIMESTAMP_INVALID', 'msecs must be a finite integer')
  }
  const msecsDiff = BigInt(msecs) - BigInt(epoch)
  if (msecsDiff < 0n || msecsDiff > MAX_TIMESTAMP_DIFF) {
    throw new InvalidInputError(
      'TSID_TIMESTAMP_OUT_OF_RANGE',
      `msecs - epoch must be between 0 and ${MAX_TIMESTAMP_DIFF}`,
    )
  }

  return {
    msecsDiff,
    node: optNode ?? randomUint32() & nodeMask,
    counterBits,
    counter: optCounter ?? randomUint32() & counterMask,
  }
}

/*
 * Overload: no buffer => return a TSID bigint.
 */
function tsidFn(options?: TsidOptions, buf?: undefined, offset?: number): bigint
/*
 * Overload: caller provides a buffer slice to fill with TSID bytes.
 */
function tsidFn<TBuf extends Uint8Array = Uint8Array>(
  options: TsidOptions | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function tsidFn<TBuf extends Uint8Array = Uint8Array>(options?: TsidOptions, buf?: TBuf, offset = 0): bigint | TBuf {
  let msecsDiff: bigint
  let node: number
  let counterBits: number
  let counter: number

  if (options) {
    const resolved = resolveTsidOptions(options)
    msecsDiff = resolved.msecsDiff
    node = resolved.node
    counterBits = resolved.counterBits
    counter = resolved.counter
  } else {
    // Lazily initialize the persistent node ID on first no-option call.
    if (state.node === undefined) {
      state.node = randomUint32() & DEFAULT_NODE_MASK
    }
    node = state.node
    counterBits = DEFAULT_COUNTER_BITS

    /**
     * Note: by default, Cloudflare Workers "freezes" time during request handling
     * to prevent side-channel attacks, so Date.now() returns the same value for
     * the entire duration of a request. Monotonic ordering within such a request
     * relies entirely on the counter (and its clock-drift-ahead overflow below).
     */
    const now = Date.now()
    if (now > state.msecs) {
      state.msecs = now
      state.counter = randomUint32() & DEFAULT_COUNTER_MASK
    } else {
      state.counter += 1
      if (state.counter > DEFAULT_COUNTER_MASK) {
        // Counter overflowed within this real millisecond: advance the internal
        // virtual timestamp ahead of wall-clock time rather than throwing. A
        // 12-bit counter (4096 values/ms) is a realistic throughput ceiling.
        state.msecs += 1
        state.counter = 0
      }
    }
    counter = state.counter
    msecsDiff = BigInt(state.msecs) - BigInt(TSID_EPOCH)
  }

  const packed = pack(msecsDiff, node, counterBits, counter)

  if (buf) {
    if (!isWritableRange(buf, offset, TSID_BYTES)) {
      throw new BufferError(
        'TSID_BUFFER_OUT_OF_BOUNDS',
        `TSID byte range ${offset}:${offset + TSID_BYTES - 1} is out of buffer bounds`,
      )
    }
    writeTsidBytesUnchecked(packed, buf, offset)
    return buf
  }

  return packed
}

/**
 * Convert a TSID bigint to 8 bytes.
 */
function toBytes(id: bigint): Uint8Array {
  assertValidTsid(id)
  const bytes = new Uint8Array(TSID_BYTES)
  writeTsidBytesUnchecked(id, bytes, 0)
  return bytes
}

/**
 * Convert 8 bytes to a TSID bigint.
 */
function fromBytes(bytes: Uint8Array): bigint {
  if (bytes.length !== TSID_BYTES) {
    throw new BufferError(
      'TSID_BYTES_INVALID_LENGTH',
      `TSID bytes must be exactly ${TSID_BYTES} bytes, got ${bytes.length}`,
    )
  }

  let value = 0n
  for (let i = 0; i < TSID_BYTES; i += 1) {
    value = (value << 8n) | BigInt(bytes[i])
  }
  return value
}

/**
 * Extract the timestamp (milliseconds since Unix epoch) from a TSID.
 * The epoch is not self-describing in the packed value - pass the same
 * `epoch` used at generation time if it was overridden from the default.
 */
function timestamp(id: bigint, epoch: number = TSID_EPOCH): number {
  assertValidTsid(id)
  if (!Number.isInteger(epoch)) {
    throw new InvalidInputError('TSID_EPOCH_INVALID', 'epoch must be a finite integer')
  }
  return epoch + Number(id >> BigInt(RANDOM_BITS))
}

/**
 * Validate that a value is a TSID bigint within the 64-bit range.
 */
function isValid(id: unknown): id is bigint {
  return typeof id === 'bigint' && id >= 0n && id <= MAX
}

const NIL = 0n
const MAX = (1n << 64n) - 1n

function assertValidTsid(id: bigint): void {
  if (id < NIL || id > MAX) {
    throw new InvalidInputError('TSID_VALUE_OUT_OF_RANGE', `TSID value must be between ${NIL} and ${MAX}`)
  }
}

function toString(id: bigint): string {
  assertValidTsid(id)
  return encodeTsidString(id)
}

/**
 * Generate a TSID bigint or write the bytes into a buffer.
 *
 * TSID (Time-Sorted Unique Identifier) is a 64-bit Snowflake-style identifier
 * combining a millisecond timestamp, a node ID, and a per-millisecond counter.
 * Unlike every other uniku generator, it returns a `bigint` by default, since
 * TSID's entire value proposition is native numeric storage (e.g. a database
 * BIGINT primary key).
 *
 * @example
 * ```ts
 * import { tsid } from 'uniku/tsid'
 *
 * const id = tsid()
 * // => 862301223059968074n
 *
 * // Canonical string form
 * const str = tsid.toString(id)
 * // => "0QXW2CK4XZM2A"
 * tsid.fromString(str) === id // true
 *
 * // Extract timestamp
 * const ts = tsid.timestamp(id)
 * console.log(new Date(ts))
 *
 * // Validate
 * tsid.isValid(id) // true
 *
 * // Convert to/from bytes (8 bytes)
 * const bytes = tsid.toBytes(id)
 * const restored = tsid.fromBytes(bytes)
 * ```
 */
export const tsid: Tsid = Object.assign(tsidFn, {
  toBytes,
  fromBytes,
  toString,
  fromString: decodeTsidString,
  timestamp,
  isValid,
  NIL,
  MAX,
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
