import { rng } from '../common/random'
import { isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { formatUuid, formatUuidUnchecked, parseUuid } from './common/uuid'

const randomUUID = /*@__PURE__*/ globalThis.crypto.randomUUID.bind(globalThis.crypto)
const UUID_BYTES = 16
const reusableBuf = new Uint8Array(UUID_BYTES)

export type UuidV4Options = {
  /**
   * 16 bytes of random data to use for UUID generation.
   */
  random?: Uint8Array
}

export type UuidV4 = {
  /** Generate a random UUID v4 string. */
  (): string
  /** Generate a UUID v4 with explicit options or write its 16 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(options: UuidV4Options | undefined, buf: TBuf, offset?: number): TBuf
  /** Generate a UUID v4 string with optional deterministic random bytes. */
  (options?: UuidV4Options, buf?: undefined, offset?: number): string
  /** Convert a UUID v4 string to its canonical 16-byte representation. */
  toBytes(id: string): Uint8Array
  /** Convert 16 canonical UUID bytes to a UUID v4 string. */
  fromBytes(bytes: Uint8Array): string
  /** Return whether a value is a syntactically valid UUID v4 string. */
  isValid(id: unknown): id is string
  /** The nil UUID (all zeros) */
  NIL: string
  /** The max UUID (all ones) */
  MAX: string
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function writeV4BytesUnchecked(rnds: Uint8Array, buf: Uint8Array, offset: number): void {
  // Copy 16 UUID bytes into the provided buffer slice.
  for (let i = 0; i < UUID_BYTES; i += 1) {
    buf[offset + i] = rnds[i]
  }

  // Set RFC 4122 version (4) and variant (10xx) bits on owned output only.
  buf[offset + 6] = (buf[offset + 6] & 0x0f) | 0x40
  buf[offset + 8] = (buf[offset + 8] & 0x3f) | 0x80
}

/*
 * Overload: no buffer => return a UUID string.
 */
function v4(options?: UuidV4Options, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with UUID bytes.
 */
function v4<TBuf extends Uint8Array = Uint8Array>(options: UuidV4Options | undefined, buf: TBuf, offset?: number): TBuf
function v4<TBuf extends Uint8Array = Uint8Array>(options?: UuidV4Options, buf?: TBuf, offset?: number): string | TBuf {
  if (!buf && !options) {
    return randomUUID()
  }

  return _v4(options, buf, offset)
}

function _v4<TBuf extends Uint8Array = Uint8Array>(
  options?: UuidV4Options,
  buf?: TBuf,
  offset?: number,
): string | TBuf {
  const random = options?.random
  if (random && random.length < UUID_BYTES) {
    throw new InvalidInputError('UUID_RANDOM_BYTES_TOO_SHORT', `Random bytes length must be >= ${UUID_BYTES}`)
  }

  const outputOffset = buf ? (offset ?? 0) : 0
  if (buf && !isWritableRange(buf, outputOffset, UUID_BYTES)) {
    throw new BufferError(
      'UUID_BUFFER_OUT_OF_BOUNDS',
      `UUID byte range ${outputOffset}:${outputOffset + UUID_BYTES - 1} is out of buffer bounds`,
    )
  }

  const output = buf ?? reusableBuf
  writeV4BytesUnchecked(random ?? rng(), output, outputOffset)
  return buf ?? formatUuidUnchecked(output)
}

function isValid(id: unknown): id is string {
  return typeof id === 'string' && UUID_V4_REGEX.test(id)
}

/**
 * Generate a UUID v4 string or write the bytes into a buffer.
 *
 * UUID v4 is a purely random UUID with 122 bits of entropy. It's the most
 * widely compatible UUID format, supported by virtually all databases and systems.
 * Use when you need maximum compatibility and don't require time-ordering.
 *
 * @example
 * ```ts
 * import { uuidv4 } from 'uniku/uuid/v4'
 *
 * const id = uuidv4()
 * // => "550e8400-e29b-41d4-a716-446655440000"
 *
 * // Validate
 * uuidv4.isValid(id) // true
 *
 * // Convert to/from bytes (16 bytes)
 * const bytes = uuidv4.toBytes(id)
 * const restored = uuidv4.fromBytes(bytes)
 * ```
 */
export const uuidv4: UuidV4 = Object.assign(v4, {
  toBytes: parseUuid,
  fromBytes: formatUuid,
  isValid,
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
