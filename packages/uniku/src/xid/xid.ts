import { writeTimestamp32 } from '../common/bytes'
import { randomBytes, randomUint32 } from '../common/random'
import { resolveTimestampSecs } from '../common/timestamp'
import { isIntegerInRange, isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { decodeBase32Hex, encodeBase32Hex, encodeCounterSuffix } from './base32hex'

const XID_BYTES = 12
const MACHINE_ID_BYTES = 3
const MAX_SECS = 0xffffffff
const MAX_PROCESS_ID = 0xffff
const MAX_COUNTER = 0xffffff
const XID_REGEX = /^[0-9a-v]{19}[0g]$/
const stringBuffer = new Uint8Array(XID_BYTES)
let cachedPrefixSecs = -1
let cachedPrefix = ''

export type XidOptions = {
  /** First three bytes used as the XID machine identity. */
  machineId?: Uint8Array
  /** 16-bit process identity. */
  processId?: number
  /**
   * Unix timestamp in milliseconds. Defaults to Date.now().
   * XID stores whole seconds, so sub-second precision is truncated.
   */
  msecs?: number
  /**
   * Unix timestamp in seconds.
   *
   * @deprecated Use `msecs` instead. Will be removed at v1-rc.
   */
  // TODO(v1-rc): remove this alias (tracked in docs/STABILITY.md).
  secs?: number
  /** 24-bit counter. Explicit values do not consume shared state. */
  counter?: number
}

export type Xid = {
  (): string
  <TBuf extends Uint8Array = Uint8Array>(options: XidOptions | undefined, buf: TBuf, offset?: number): TBuf
  (options?: XidOptions, buf?: undefined, offset?: number): string
  toBytes(id: string): Uint8Array
  fromBytes(bytes: Uint8Array): string
  timestamp(id: string): number
  isValid(id: unknown): id is string
  NIL: string
  MAX: string
}

type XidState = {
  machineId: Uint8Array | undefined
  processId: number | undefined
  counter: number | undefined
}

const state: XidState = { machineId: undefined, processId: undefined, counter: undefined }

/** Copy pooled bytes before another random draw can refill their backing pool. */
function freshRandom(count: number): Uint8Array {
  return randomBytes(count).slice()
}

function initializeIdentity(): void {
  if (state.machineId === undefined) state.machineId = freshRandom(MACHINE_ID_BYTES)
  if (state.processId === undefined) state.processId = randomUint32() & MAX_PROCESS_ID
}

function nextCounter(): number {
  if (state.counter === undefined) state.counter = randomUint32() & MAX_COUNTER
  state.counter = (state.counter + 1) & MAX_COUNTER
  return state.counter
}

function writeXidBytesUnchecked(
  secs: number,
  machineId: Uint8Array,
  processId: number,
  counter: number,
  buf: Uint8Array,
  offset: number,
): void {
  writeTimestamp32(buf, offset, secs)
  buf.set(machineId.subarray(0, MACHINE_ID_BYTES), offset + 4)
  buf[offset + 7] = processId >>> 8
  buf[offset + 8] = processId & 0xff
  buf[offset + 9] = counter >>> 16
  buf[offset + 10] = (counter >>> 8) & 0xff
  buf[offset + 11] = counter & 0xff
}

function validateOptions(options: XidOptions): void {
  if (options.machineId !== undefined && options.machineId.length < MACHINE_ID_BYTES) {
    throw new InvalidInputError(
      'XID_MACHINE_ID_BYTES_TOO_SHORT',
      `Machine ID bytes length must be >= ${MACHINE_ID_BYTES} for XID`,
    )
  }
  if (options.processId !== undefined && !isIntegerInRange(options.processId, 0, MAX_PROCESS_ID)) {
    throw new InvalidInputError('XID_PROCESS_ID_OUT_OF_RANGE', `Process ID must be between 0 and ${MAX_PROCESS_ID}`)
  }
  if (options.counter !== undefined && !isIntegerInRange(options.counter, 0, MAX_COUNTER)) {
    throw new InvalidInputError('XID_COUNTER_OUT_OF_RANGE', `Counter must be between 0 and ${MAX_COUNTER}`)
  }
}

function xidFn(options?: XidOptions, buf?: undefined, offset?: number): string
function xidFn<TBuf extends Uint8Array = Uint8Array>(options: XidOptions | undefined, buf: TBuf, offset?: number): TBuf
function xidFn<TBuf extends Uint8Array = Uint8Array>(options?: XidOptions, buf?: TBuf, offset = 0): string | TBuf {
  if (options === undefined && buf === undefined) {
    initializeIdentity()
    const secs = Math.floor(Date.now() / 1000)
    const counter = nextCounter()
    if (secs !== cachedPrefixSecs) {
      writeXidBytesUnchecked(secs, state.machineId!, state.processId!, counter, stringBuffer, 0)
      cachedPrefix = encodeBase32Hex(stringBuffer).slice(0, 14)
      cachedPrefixSecs = secs
    }
    return cachedPrefix + encodeCounterSuffix(state.processId! & 0xff, counter)
  }

  if (options !== undefined) validateOptions(options)

  const resolvedSecs = options === undefined ? undefined : resolveTimestampSecs(options, 0, MAX_SECS, 'xid')
  const secs = resolvedSecs ?? Math.floor(Date.now() / 1000)
  if (options?.machineId === undefined || options.processId === undefined) {
    initializeIdentity()
  }
  const machineId = options?.machineId ?? state.machineId!
  const processId = options?.processId ?? state.processId!
  const counter = options?.counter ?? nextCounter()

  if (buf !== undefined) {
    if (!isWritableRange(buf, offset, XID_BYTES)) {
      throw new BufferError(
        'XID_BUFFER_OUT_OF_BOUNDS',
        `XID byte range ${offset}:${offset + 11} is out of buffer bounds`,
      )
    }
    writeXidBytesUnchecked(secs, machineId, processId, counter, buf, offset)
    return buf
  }

  writeXidBytesUnchecked(secs, machineId, processId, counter, stringBuffer, 0)
  return encodeBase32Hex(stringBuffer)
}

function toBytes(id: string): Uint8Array {
  return decodeBase32Hex(id)
}

function fromBytes(bytes: Uint8Array): string {
  return encodeBase32Hex(bytes)
}

function timestamp(id: string): number {
  const bytes = decodeBase32Hex(id)
  return (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0) * 1000
}

function isValid(id: unknown): id is string {
  return typeof id === 'string' && XID_REGEX.test(id)
}

/**
 * Generate a 20-character rs/xid-compatible identifier.
 *
 * XID embeds seconds, a lazily-random per-runtime identity, and a shared
 * always-incrementing counter. In Cloudflare Workers, time is frozen during a
 * request, so the counter preserves ordering for IDs made in that request.
 */
export const xid: Xid = Object.assign(xidFn, {
  toBytes,
  fromBytes,
  timestamp,
  isValid,
  NIL: '0'.repeat(20),
  MAX: encodeBase32Hex(new Uint8Array(12).fill(0xff)),
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
