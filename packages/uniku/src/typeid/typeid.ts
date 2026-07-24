import { isIntegerInRange } from '../common/validation'
import { InvalidInputError, ParseError } from '../errors'
import type { UuidV7Options } from '../uuid/v7'
import { uuidv7 } from '../uuid/v7'

export type TypeidOptions = UuidV7Options

export type Typeid = {
  /** Generate a TypeID from a lowercase entity prefix and a UUID v7 suffix. */
  (prefix: string, options?: TypeidOptions): string
  /** Convert a TypeID's UUID v7 suffix to its canonical 16-byte representation. */
  toBytes(id: string): Uint8Array
  /** Build a TypeID from a prefix and canonical UUID v7 bytes. */
  fromBytes(prefix: string, bytes: Uint8Array): string
  /** Convert a TypeID to its UUID v7 string. */
  toUuid(id: string): string
  /** Build a TypeID from a prefix and UUID v7 string. */
  fromUuid(prefix: string, uuid: string): string
  /** Read the UUID v7 timestamp embedded in a TypeID, in milliseconds. */
  timestamp(id: string): number
  /** Read a TypeID's entity prefix. */
  prefix(id: string): string
  /** Read a TypeID's UUID v7 suffix. */
  suffix(id: string): string
  /** Return whether a value is a syntactically valid TypeID. */
  isValid(id: unknown): id is string
}

const TYPEID_SUFFIX_LENGTH = 26
const TYPEID_UUID_BYTE_LENGTH = 16
// 48-bit UUID v7 timestamp capacity, mirrored from uuid/v7 so timestamp
// validation is attributed to the typeid boundary instead of leaking
// `strategy: 'uuid'` through delegation.
const MAX_MSECS = 0xffffffffffff
const TYPEID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

const BASE32_DECODE: number[] = Array.from({ length: 128 }, () => -1)
for (let i = 0; i < TYPEID_ALPHABET.length; i += 1) {
  BASE32_DECODE[TYPEID_ALPHABET.charCodeAt(i)] = i
}

type ParsedTypeid = {
  prefix: string
  suffix: string
  bytes: Uint8Array
}

function assertValidPrefix(prefix: string): void {
  if (prefix.length === 0) {
    return
  }

  if (prefix.length > 63) {
    throw new InvalidInputError('PREFIX_TOO_LONG', 'TypeID prefix must be at most 63 characters', {
      strategy: 'typeid',
    })
  }

  for (let i = 0; i < prefix.length; i += 1) {
    const code = prefix.charCodeAt(i)
    const isLowercaseLetter = code >= 97 && code <= 122
    const isUnderscore = code === 95

    if (!isLowercaseLetter && !isUnderscore) {
      throw new InvalidInputError(
        'PREFIX_INVALID_CHAR',
        'TypeID prefix must contain only lowercase ASCII letters and underscores',
        { strategy: 'typeid' },
      )
    }

    if ((i === 0 || i === prefix.length - 1) && !isLowercaseLetter) {
      throw new InvalidInputError('PREFIX_INVALID_BOUNDARY', 'TypeID prefix must start and end with a-z', {
        strategy: 'typeid',
      })
    }
  }
}

function decodeSuffixValue(suffix: string, index: number): number {
  const code = suffix.charCodeAt(index)
  const value = code < BASE32_DECODE.length ? BASE32_DECODE[code] : -1

  if (value === -1) {
    throw new ParseError('INVALID_CHAR', `TypeID suffix contains invalid character at position ${index}`, {
      strategy: 'typeid',
    })
  }

  return value
}

function assertValidSuffixShape(suffix: string): void {
  if (suffix.length !== TYPEID_SUFFIX_LENGTH) {
    throw new ParseError('INVALID_LENGTH', `TypeID suffix must be 26 characters, got ${suffix.length}`, {
      strategy: 'typeid',
    })
  }

  if (suffix[0] > '7') {
    throw new ParseError('VALUE_OUT_OF_RANGE', 'TypeID suffix must encode a 128-bit value', {
      strategy: 'typeid',
    })
  }
}

function encodeBytesToSuffix(bytes: Uint8Array): string {
  if (bytes.length !== TYPEID_UUID_BYTE_LENGTH) {
    throw new InvalidInputError('BYTES_INVALID_LENGTH', `UUID bytes must be 16 bytes, got ${bytes.length}`, {
      strategy: 'typeid',
    })
  }

  return (
    TYPEID_ALPHABET[(bytes[0] & 0xe0) >> 5] +
    TYPEID_ALPHABET[bytes[0] & 0x1f] +
    TYPEID_ALPHABET[(bytes[1] & 0xf8) >> 3] +
    TYPEID_ALPHABET[((bytes[1] & 0x07) << 2) | ((bytes[2] & 0xc0) >> 6)] +
    TYPEID_ALPHABET[(bytes[2] & 0x3e) >> 1] +
    TYPEID_ALPHABET[((bytes[2] & 0x01) << 4) | ((bytes[3] & 0xf0) >> 4)] +
    TYPEID_ALPHABET[((bytes[3] & 0x0f) << 1) | ((bytes[4] & 0x80) >> 7)] +
    TYPEID_ALPHABET[(bytes[4] & 0x7c) >> 2] +
    TYPEID_ALPHABET[((bytes[4] & 0x03) << 3) | ((bytes[5] & 0xe0) >> 5)] +
    TYPEID_ALPHABET[bytes[5] & 0x1f] +
    TYPEID_ALPHABET[(bytes[6] & 0xf8) >> 3] +
    TYPEID_ALPHABET[((bytes[6] & 0x07) << 2) | ((bytes[7] & 0xc0) >> 6)] +
    TYPEID_ALPHABET[(bytes[7] & 0x3e) >> 1] +
    TYPEID_ALPHABET[((bytes[7] & 0x01) << 4) | ((bytes[8] & 0xf0) >> 4)] +
    TYPEID_ALPHABET[((bytes[8] & 0x0f) << 1) | ((bytes[9] & 0x80) >> 7)] +
    TYPEID_ALPHABET[(bytes[9] & 0x7c) >> 2] +
    TYPEID_ALPHABET[((bytes[9] & 0x03) << 3) | ((bytes[10] & 0xe0) >> 5)] +
    TYPEID_ALPHABET[bytes[10] & 0x1f] +
    TYPEID_ALPHABET[(bytes[11] & 0xf8) >> 3] +
    TYPEID_ALPHABET[((bytes[11] & 0x07) << 2) | ((bytes[12] & 0xc0) >> 6)] +
    TYPEID_ALPHABET[(bytes[12] & 0x3e) >> 1] +
    TYPEID_ALPHABET[((bytes[12] & 0x01) << 4) | ((bytes[13] & 0xf0) >> 4)] +
    TYPEID_ALPHABET[((bytes[13] & 0x0f) << 1) | ((bytes[14] & 0x80) >> 7)] +
    TYPEID_ALPHABET[(bytes[14] & 0x7c) >> 2] +
    TYPEID_ALPHABET[((bytes[14] & 0x03) << 3) | ((bytes[15] & 0xe0) >> 5)] +
    TYPEID_ALPHABET[bytes[15] & 0x1f]
  )
}

function decodeSuffixToBytes(suffix: string): Uint8Array {
  assertValidSuffixShape(suffix)

  const values = new Array<number>(TYPEID_SUFFIX_LENGTH)
  for (let i = 0; i < TYPEID_SUFFIX_LENGTH; i += 1) {
    values[i] = decodeSuffixValue(suffix, i)
  }

  const bytes = new Uint8Array(TYPEID_UUID_BYTE_LENGTH)
  bytes[0] = (values[0] << 5) | values[1]
  bytes[1] = (values[2] << 3) | (values[3] >> 2)
  bytes[2] = ((values[3] & 0x03) << 6) | (values[4] << 1) | (values[5] >> 4)
  bytes[3] = ((values[5] & 0x0f) << 4) | (values[6] >> 1)
  bytes[4] = ((values[6] & 0x01) << 7) | (values[7] << 2) | (values[8] >> 3)
  bytes[5] = ((values[8] & 0x07) << 5) | values[9]
  bytes[6] = (values[10] << 3) | (values[11] >> 2)
  bytes[7] = ((values[11] & 0x03) << 6) | (values[12] << 1) | (values[13] >> 4)
  bytes[8] = ((values[13] & 0x0f) << 4) | (values[14] >> 1)
  bytes[9] = ((values[14] & 0x01) << 7) | (values[15] << 2) | (values[16] >> 3)
  bytes[10] = ((values[16] & 0x07) << 5) | values[17]
  bytes[11] = (values[18] << 3) | (values[19] >> 2)
  bytes[12] = ((values[19] & 0x03) << 6) | (values[20] << 1) | (values[21] >> 4)
  bytes[13] = ((values[21] & 0x0f) << 4) | (values[22] >> 1)
  bytes[14] = ((values[22] & 0x01) << 7) | (values[23] << 2) | (values[24] >> 3)
  bytes[15] = ((values[24] & 0x07) << 5) | values[25]

  return bytes
}

function assertUuidV7Bytes(bytes: Uint8Array): void {
  if (bytes.length !== TYPEID_UUID_BYTE_LENGTH) {
    throw new InvalidInputError('BYTES_INVALID_LENGTH', `UUID bytes must be 16 bytes, got ${bytes.length}`, {
      strategy: 'typeid',
    })
  }

  if (bytes[6] >> 4 !== 7 || (bytes[8] & 0xc0) !== 0x80) {
    throw new InvalidInputError('UUID_NOT_V7', 'TypeID UUID bytes must encode a UUID v7 value', {
      strategy: 'typeid',
    })
  }
}

function uuidV7BytesFromSuffix(suffix: string): Uint8Array {
  const bytes = decodeSuffixToBytes(suffix)
  assertUuidV7Bytes(bytes)
  return bytes
}

function uuidV7BytesFromUuid(uuid: string): Uint8Array {
  if (!uuidv7.isValid(uuid)) {
    throw new InvalidInputError('UUID_NOT_V7', 'TypeID can only wrap UUID v7 values', { strategy: 'typeid' })
  }

  return uuidv7.toBytes(uuid)
}

function parseTypeid(id: string): ParsedTypeid {
  const separatorIndex = id.lastIndexOf('_')

  if (separatorIndex === 0) {
    throw new ParseError('INVALID_FORMAT', 'TypeID must not start with "_"', { strategy: 'typeid' })
  }

  const prefix = separatorIndex === -1 ? '' : id.slice(0, separatorIndex)
  const suffix = separatorIndex === -1 ? id : id.slice(separatorIndex + 1)

  assertValidPrefix(prefix)
  const bytes = uuidV7BytesFromSuffix(suffix)

  return { prefix, suffix, bytes }
}

function joinPrefixAndSuffix(prefix: string, suffix: string): string {
  return prefix === '' ? suffix : `${prefix}_${suffix}`
}

function formatTypeidFromUuidV7Bytes(prefix: string, bytes: Uint8Array): string {
  assertValidPrefix(prefix)
  assertUuidV7Bytes(bytes)
  return joinPrefixAndSuffix(prefix, encodeBytesToSuffix(bytes))
}

function timestampFromUuidV7Bytes(bytes: Uint8Array): number {
  let msecs = 0
  for (let i = 0; i < 6; i += 1) {
    msecs = msecs * 256 + bytes[i]
  }
  return msecs
}

function typeidFn(prefix: string, options?: TypeidOptions): string {
  const msecs = options?.msecs
  if (msecs !== undefined && !isIntegerInRange(msecs, 0, MAX_MSECS)) {
    throw new InvalidInputError('TIMESTAMP_OUT_OF_RANGE', `Timestamp must be an integer between 0 and ${MAX_MSECS}`, {
      strategy: 'typeid',
    })
  }

  const bytes = uuidv7(options, new Uint8Array(TYPEID_UUID_BYTE_LENGTH))
  return formatTypeidFromUuidV7Bytes(prefix, bytes)
}

function typeidToBytes(id: string): Uint8Array {
  return parseTypeid(id).bytes
}

function typeidFromBytes(prefix: string, bytes: Uint8Array): string {
  return formatTypeidFromUuidV7Bytes(prefix, bytes)
}

function typeidToUuid(id: string): string {
  return uuidv7.fromBytes(typeidToBytes(id))
}

function typeidFromUuid(prefix: string, uuid: string): string {
  return formatTypeidFromUuidV7Bytes(prefix, uuidV7BytesFromUuid(uuid))
}

function timestamp(id: string): number {
  return timestampFromUuidV7Bytes(parseTypeid(id).bytes)
}

function prefix(id: string): string {
  return parseTypeid(id).prefix
}

function suffix(id: string): string {
  return parseTypeid(id).suffix
}

function isValid(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false
  }

  try {
    parseTypeid(id)
  } catch {
    return false
  }

  return true
}

/**
 * Generate a TypeID string backed by UUID v7.
 *
 * TypeID combines a lowercase snake_case type prefix with a 26-character
 * modified base32 encoding of a UUID v7, producing sortable domain identifiers
 * such as `user_01h2xcejqtf2nbrexx3vqjhp41`.
 *
 * @example
 * ```ts
 * import { typeid } from 'uniku/typeid'
 *
 * const id = typeid('user')
 * // => "user_01h2xcejqtf2nbrexx3vqjhp41"
 *
 * const uuid = typeid.toUuid(id)
 * const restored = typeid.fromUuid('user', uuid)
 * ```
 */
export const typeid: Typeid = Object.assign(typeidFn, {
  toBytes: typeidToBytes,
  fromBytes: typeidFromBytes,
  toUuid: typeidToUuid,
  fromUuid: typeidFromUuid,
  timestamp,
  prefix,
  suffix,
  isValid,
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
