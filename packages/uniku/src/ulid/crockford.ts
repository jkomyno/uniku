/**
 * Crockford's Base32 encoding/decoding for ULID.
 * Alphabet excludes I, L, O, U to avoid confusion with similar-looking characters.
 */

import { BufferError, ParseError } from '../errors'

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

// Pre-computed decoding table indexed by ASCII code (0-127)
// Uses Uint8Array for cache-efficient lookups via charCodeAt
const DECODING = new Uint8Array(128)
DECODING.fill(255) // 255 = invalid marker
for (let i = 0; i < ENCODING.length; i += 1) {
  const upper = ENCODING.charCodeAt(i)
  const lower = ENCODING[i].toLowerCase().charCodeAt(0)
  DECODING[upper] = i
  DECODING[lower] = i
}

const TIME_LEN = 10
const ULID_LEN = 26

function invalidCharError(str: string, index: number): ParseError {
  return new ParseError('ULID_INVALID_CHAR', `Invalid ULID character: ${str[index]}`)
}

function decodeTimeChars(str: string): number {
  const firstCode = str.charCodeAt(0)
  if (firstCode >= 128) {
    throw invalidCharError(str, 0)
  }

  const firstValue = DECODING[firstCode]
  if (firstValue === 255) {
    throw invalidCharError(str, 0)
  }

  if (firstValue > 7) {
    throw new ParseError('ULID_TIMESTAMP_OVERFLOW', 'ULID timestamp exceeds 48 bits')
  }

  let time = firstValue
  for (let i = 1; i < TIME_LEN; i += 1) {
    const code = str.charCodeAt(i)
    if (code >= 128) {
      throw invalidCharError(str, i)
    }

    const value = DECODING[code]
    if (value === 255) {
      throw invalidCharError(str, i)
    }

    time = time * 32 + value
  }
  return time
}

/**
 * Encode a 48-bit timestamp to a 10-character Crockford Base32 string.
 * Uses unrolled division for performance.
 */
export function encodeTime(time: number): string {
  // Unrolled encoding - each step divides by 32 and extracts 5 bits
  // Powers of 32: 32^9=0x200000000000, 32^8=0x10000000000, etc.
  return (
    ENCODING[Math.floor(time / 0x200000000000) & 0x1f] +
    ENCODING[Math.floor(time / 0x10000000000) & 0x1f] +
    ENCODING[Math.floor(time / 0x800000000) & 0x1f] +
    ENCODING[Math.floor(time / 0x40000000) & 0x1f] +
    ENCODING[Math.floor(time / 0x2000000) & 0x1f] +
    ENCODING[Math.floor(time / 0x100000) & 0x1f] +
    ENCODING[Math.floor(time / 0x8000) & 0x1f] +
    ENCODING[Math.floor(time / 0x400) & 0x1f] +
    ENCODING[Math.floor(time / 0x20) & 0x1f] +
    ENCODING[time & 0x1f]
  )
}

/**
 * Encode 10 bytes (80 bits) of random data to a 16-character Crockford Base32 string.
 */
export function encodeRandom(bytes: Uint8Array): string {
  // Each character encodes 5 bits. 80 bits = 16 characters.
  // Single concatenation expression for optimal performance.
  return (
    ENCODING[(bytes[0] >> 3) & 0x1f] +
    ENCODING[((bytes[0] << 2) | (bytes[1] >> 6)) & 0x1f] +
    ENCODING[(bytes[1] >> 1) & 0x1f] +
    ENCODING[((bytes[1] << 4) | (bytes[2] >> 4)) & 0x1f] +
    ENCODING[((bytes[2] << 1) | (bytes[3] >> 7)) & 0x1f] +
    ENCODING[(bytes[3] >> 2) & 0x1f] +
    ENCODING[((bytes[3] << 3) | (bytes[4] >> 5)) & 0x1f] +
    ENCODING[bytes[4] & 0x1f] +
    ENCODING[(bytes[5] >> 3) & 0x1f] +
    ENCODING[((bytes[5] << 2) | (bytes[6] >> 6)) & 0x1f] +
    ENCODING[(bytes[6] >> 1) & 0x1f] +
    ENCODING[((bytes[6] << 4) | (bytes[7] >> 4)) & 0x1f] +
    ENCODING[((bytes[7] << 1) | (bytes[8] >> 7)) & 0x1f] +
    ENCODING[(bytes[8] >> 2) & 0x1f] +
    ENCODING[((bytes[8] << 3) | (bytes[9] >> 5)) & 0x1f] +
    ENCODING[bytes[9] & 0x1f]
  )
}

/**
 * Decode a 10-character ULID timestamp string to Unix epoch milliseconds.
 */
export function decodeTime(str: string): number {
  if (str.length !== TIME_LEN) {
    throw new ParseError('ULID_INVALID_LENGTH', `ULID timestamp must be ${TIME_LEN} characters`)
  }
  return decodeTimeChars(str)
}

/**
 * Decode the timestamp from a full 26-character ULID string.
 */
export function decodeUlidTime(str: string): number {
  if (str.length !== ULID_LEN) {
    throw new ParseError('ULID_INVALID_LENGTH', `ULID string must be ${ULID_LEN} characters`)
  }
  return decodeTimeChars(str)
}

/**
 * Decode a 26-character ULID string to 16 bytes.
 * Inlines all lookups to avoid intermediate array allocation.
 */
export function decodeToBytes(str: string): Uint8Array {
  if (str.length !== ULID_LEN) {
    throw new ParseError('ULID_INVALID_LENGTH', 'ULID string must be 26 characters')
  }

  const bytes = new Uint8Array(16)

  // Inline all 26 character lookups
  const c0 = str.charCodeAt(0)
  const c1 = str.charCodeAt(1)
  const c2 = str.charCodeAt(2)
  const c3 = str.charCodeAt(3)
  const c4 = str.charCodeAt(4)
  const c5 = str.charCodeAt(5)
  const c6 = str.charCodeAt(6)
  const c7 = str.charCodeAt(7)
  const c8 = str.charCodeAt(8)
  const c9 = str.charCodeAt(9)
  const c10 = str.charCodeAt(10)
  const c11 = str.charCodeAt(11)
  const c12 = str.charCodeAt(12)
  const c13 = str.charCodeAt(13)
  const c14 = str.charCodeAt(14)
  const c15 = str.charCodeAt(15)
  const c16 = str.charCodeAt(16)
  const c17 = str.charCodeAt(17)
  const c18 = str.charCodeAt(18)
  const c19 = str.charCodeAt(19)
  const c20 = str.charCodeAt(20)
  const c21 = str.charCodeAt(21)
  const c22 = str.charCodeAt(22)
  const c23 = str.charCodeAt(23)
  const c24 = str.charCodeAt(24)
  const c25 = str.charCodeAt(25)

  const v0 = DECODING[c0]
  const v1 = DECODING[c1]
  const v2 = DECODING[c2]
  const v3 = DECODING[c3]
  const v4 = DECODING[c4]
  const v5 = DECODING[c5]
  const v6 = DECODING[c6]
  const v7 = DECODING[c7]
  const v8 = DECODING[c8]
  const v9 = DECODING[c9]
  const v10 = DECODING[c10]
  const v11 = DECODING[c11]
  const v12 = DECODING[c12]
  const v13 = DECODING[c13]
  const v14 = DECODING[c14]
  const v15 = DECODING[c15]
  const v16 = DECODING[c16]
  const v17 = DECODING[c17]
  const v18 = DECODING[c18]
  const v19 = DECODING[c19]
  const v20 = DECODING[c20]
  const v21 = DECODING[c21]
  const v22 = DECODING[c22]
  const v23 = DECODING[c23]
  const v24 = DECODING[c24]
  const v25 = DECODING[c25]

  // Validate all characters (255 = invalid marker)
  if (
    ((c0 |
      c1 |
      c2 |
      c3 |
      c4 |
      c5 |
      c6 |
      c7 |
      c8 |
      c9 |
      c10 |
      c11 |
      c12 |
      c13 |
      c14 |
      c15 |
      c16 |
      c17 |
      c18 |
      c19 |
      c20 |
      c21 |
      c22 |
      c23 |
      c24 |
      c25) &
      0xff80) !==
      0 ||
    ((v0 |
      v1 |
      v2 |
      v3 |
      v4 |
      v5 |
      v6 |
      v7 |
      v8 |
      v9 |
      v10 |
      v11 |
      v12 |
      v13 |
      v14 |
      v15 |
      v16 |
      v17 |
      v18 |
      v19 |
      v20 |
      v21 |
      v22 |
      v23 |
      v24 |
      v25) &
      0x80) !==
      0
  ) {
    // Find the invalid character for error message
    for (let i = 0; i < ULID_LEN; i += 1) {
      const code = str.charCodeAt(i)
      if (code >= 128 || DECODING[code] === 255) {
        throw invalidCharError(str, i)
      }
    }
  }

  if (v0 > 7) {
    throw new ParseError('ULID_TIMESTAMP_OVERFLOW', 'ULID timestamp exceeds 48 bits')
  }

  // Timestamp: first 10 characters -> bytes 0-5
  bytes[0] = (v0 << 5) | v1
  bytes[1] = (v2 << 3) | (v3 >> 2)
  bytes[2] = (v3 << 6) | (v4 << 1) | (v5 >> 4)
  bytes[3] = (v5 << 4) | (v6 >> 1)
  bytes[4] = (v6 << 7) | (v7 << 2) | (v8 >> 3)
  bytes[5] = (v8 << 5) | v9

  // Random: last 16 characters -> bytes 6-15
  bytes[6] = (v10 << 3) | (v11 >> 2)
  bytes[7] = (v11 << 6) | (v12 << 1) | (v13 >> 4)
  bytes[8] = (v13 << 4) | (v14 >> 1)
  bytes[9] = (v14 << 7) | (v15 << 2) | (v16 >> 3)
  bytes[10] = (v16 << 5) | v17
  bytes[11] = (v18 << 3) | (v19 >> 2)
  bytes[12] = (v19 << 6) | (v20 << 1) | (v21 >> 4)
  bytes[13] = (v21 << 4) | (v22 >> 1)
  bytes[14] = (v22 << 7) | (v23 << 2) | (v24 >> 3)
  bytes[15] = (v24 << 5) | v25

  return bytes
}

/**
 * Encode 16 bytes to a 26-character ULID string.
 */
export function bytesToUlid(bytes: Uint8Array): string {
  if (bytes.length < 16) {
    throw new BufferError('ULID_BYTES_TOO_SHORT', 'Byte array must be at least 16 bytes')
  }

  // Timestamp: bytes 0-5 -> 10 characters
  let time = 0
  for (let i = 0; i < 6; i += 1) {
    time = time * 256 + bytes[i]
  }
  const timeStr = encodeTime(time)

  // Random: bytes 6-15 -> 16 characters
  const randomStr = encodeRandom(bytes.subarray(6, 16))

  return timeStr + randomStr
}
