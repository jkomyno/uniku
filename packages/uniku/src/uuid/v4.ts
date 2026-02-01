import { rng } from './common/random'
import { formatUuid, parseUuid } from './common/uuid'

export type Version4Options = {
  /**
   * 16 bytes of random data to use for UUID generation.
   * Note: Bytes at index 6 and 8 will be modified in-place to set version/variant bits.
   */
  random?: Uint8Array
}

export type UuidV4 = {
  (): string
  <TBuf extends Uint8Array = Uint8Array>(options: Version4Options | undefined, buf: TBuf, offset?: number): TBuf
  (options?: Version4Options, buf?: undefined, offset?: number): string
  toBytes(id: string): Uint8Array
  fromBytes(bytes: Uint8Array): string
}

function v4Bytes(rnds: Uint8Array, buf?: Uint8Array, offset = 0): Uint8Array {
  if (rnds.length < 16) {
    throw new Error('Random bytes length must be >= 16')
  }

  // Set RFC 4122 version (4) and variant (10xx) bits.
  // Note: This modifies the input array in-place.
  rnds[6] = (rnds[6] & 0x0f) | 0x40
  rnds[8] = (rnds[8] & 0x3f) | 0x80

  if (!buf) {
    // No output buffer provided - return the modified random bytes directly
    return rnds
  }

  if (offset < 0 || offset + 16 > buf.length) {
    throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`)
  }

  // Copy 16 UUID bytes into the provided buffer slice.
  for (let i = 0; i < 16; i += 1) {
    buf[offset + i] = rnds[i]
  }

  return buf
}

/*
 * Overload: no buffer => return a UUID string.
 */
function v4(options?: Version4Options, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with UUID bytes.
 */
function v4<TBuf extends Uint8Array = Uint8Array>(
  options: Version4Options | undefined,
  buf: TBuf,
  offset?: number,
): TBuf
function v4<TBuf extends Uint8Array = Uint8Array>(
  options?: Version4Options,
  buf?: TBuf,
  offset?: number,
): string | TBuf {
  if (globalThis.crypto?.randomUUID && !buf && !options) {
    return globalThis.crypto.randomUUID()
  }

  const bytes = v4Bytes(options?.random ?? rng(), buf, offset)
  return buf ?? formatUuid(bytes)
}

/**
 * Generate a UUID v4 string or write the bytes into a buffer.
 * It also includes helpers to convert to and from byte arrays.
 */
export const uuidv4: UuidV4 = Object.assign(v4, {
  toBytes: (id: string) => parseUuid(id),
  fromBytes: (bytes: Uint8Array) => formatUuid(bytes),
})
