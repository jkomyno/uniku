import { BufferError, ParseError } from '../errors'

/**
 * Hex encoding/decoding for ObjectID.
 * Alphabet: 0-9a-f (lowercase on encode, case-insensitive on decode)
 *
 * ObjectID binary format: 12 bytes (96 bits)
 * - 4 bytes: big-endian Unix timestamp in seconds
 * - 5 bytes: per-process random value
 * - 3 bytes: big-endian counter
 *
 * String format: 24 characters of hex
 */

const HEX_CHARS = '0123456789abcdef'
const OBJECTID_BYTES = 12
const OBJECTID_STRING_LEN = 24

// Pre-computed encode table: byte value (0-255) -> 2-char lowercase hex string.
const ENCODE_TABLE: string[] = Array.from(
  { length: 256 },
  (_, byte) => HEX_CHARS[(byte >> 4) & 0xf] + HEX_CHARS[byte & 0xf],
)

// Pre-computed decode table covering every UTF-16 code unit charCodeAt can
// return, so lookups never go out of bounds and a single `=== 255` check
// rejects invalid input (including non-ASCII) without a per-character range
// check. Costs 128 KiB once at module load; valid inputs only touch the first
// 128 bytes, so cache behavior is unaffected.
// Note: unlike Base62, hex decoding is case-insensitive - 'a' and 'A' both decode to 10.
const DECODING = new Uint8Array(65536)
DECODING.fill(255) // 255 = invalid marker

for (let i = 0; i <= 9; i += 1) {
  DECODING['0'.charCodeAt(0) + i] = i
}
for (let i = 0; i < 6; i += 1) {
  DECODING['a'.charCodeAt(0) + i] = 10 + i
  DECODING['A'.charCodeAt(0) + i] = 10 + i
}

/**
 * Encode 12 ObjectID bytes to a 24-character lowercase hex string.
 */
export function encodeObjectIdHex(bytes: Uint8Array): string {
  if (bytes.length < OBJECTID_BYTES) {
    throw new BufferError(
      'BYTES_INVALID_LENGTH',
      `ObjectID bytes must be at least ${OBJECTID_BYTES} bytes, got ${bytes.length}`,
      { strategy: 'objectid' },
    )
  }

  let encoded = ''
  for (let i = 0; i < OBJECTID_BYTES; i += 1) {
    encoded += ENCODE_TABLE[bytes[i]]
  }
  return encoded
}

/**
 * Decode a 24-character hex string to 12 ObjectID bytes.
 */
export function decodeObjectIdHex(str: string): Uint8Array {
  if (str.length !== OBJECTID_STRING_LEN) {
    throw new ParseError(
      'INVALID_LENGTH',
      `ObjectID string must be ${OBJECTID_STRING_LEN} characters, got ${str.length}`,
      { strategy: 'objectid' },
    )
  }

  const bytes = new Uint8Array(OBJECTID_BYTES)
  for (let i = 0; i < OBJECTID_BYTES; i += 1) {
    const hiIndex = i * 2
    const loIndex = hiIndex + 1
    const hi = DECODING[str.charCodeAt(hiIndex)]
    const lo = DECODING[str.charCodeAt(loIndex)]

    if (hi === 255) {
      throw new ParseError('INVALID_CHAR', `Invalid ObjectID character: ${str[hiIndex]}`, { strategy: 'objectid' })
    }
    if (lo === 255) {
      throw new ParseError('INVALID_CHAR', `Invalid ObjectID character: ${str[loIndex]}`, { strategy: 'objectid' })
    }

    bytes[i] = (hi << 4) | lo
  }

  return bytes
}
