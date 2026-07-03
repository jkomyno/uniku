import { BufferError, ParseError } from '../errors'

/**
 * Base62 encoding/decoding for KSUID.
 * Alphabet: 0-9A-Za-z (standard Base62 ordering)
 *
 * KSUID binary format: 20 bytes (160 bits)
 * - 4 bytes: timestamp (seconds since KSUID epoch)
 * - 16 bytes: payload (cryptographically random)
 *
 * String format: 27 characters of Base62
 */

// Base62 alphabet: digits (0-9), uppercase (A-Z), lowercase (a-z)
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = 62n
const MAX_KSUID_VALUE = (1n << 160n) - 1n
const KSUID_BYTES = 20
const KSUID_STRING_LEN = 27

// Pre-computed decode table covering every UTF-16 code unit charCodeAt can
// return, so lookups never go out of bounds and a single `=== 255` check
// rejects invalid input (including non-ASCII) without a per-character range
// check. Costs 64 KiB once at module load; valid inputs only touch the first
// 128 bytes, so cache behavior is unaffected.
// Note: Base62 is case-sensitive - 'A' (value 10) and 'a' (value 36) are different
const DECODING = new Uint8Array(65536)
DECODING.fill(255) // 255 = invalid marker

for (let i = 0; i < BASE62_ALPHABET.length; i += 1) {
  DECODING[BASE62_ALPHABET.charCodeAt(i)] = i
}

/**
 * Encode a 20-byte KSUID to a 27-character Base62 string.
 *
 * Algorithm: Convert the 160-bit number to base 62 using BigInt.
 * V8 has highly optimized BigInt operations for this size.
 */
export function encodeBase62(bytes: Uint8Array): string {
  if (bytes.length < KSUID_BYTES) {
    throw new BufferError(
      'KSUID_BYTES_TOO_SHORT',
      `KSUID bytes must be at least ${KSUID_BYTES} bytes, got ${bytes.length}`,
    )
  }

  // Convert bytes to BigInt (big-endian)
  let num = 0n
  for (let i = 0; i < KSUID_BYTES; i += 1) {
    num = (num << 8n) | BigInt(bytes[i])
  }

  // Convert to Base62 string (build from right to left)
  // Direct string concatenation is faster than array + join in V8
  let encoded = ''
  while (num > 0n) {
    const remainder = num % BASE
    num = num / BASE
    encoded = BASE62_ALPHABET[Number(remainder)] + encoded
  }

  // Pad the result with the zero-character ('0') to ensure a fixed length
  return encoded.padStart(KSUID_STRING_LEN, '0')
}

/**
 * Decode a 27-character Base62 string to a 20-byte KSUID.
 *
 * Algorithm: Convert Base62 string to BigInt, then to bytes.
 * V8 has highly optimized BigInt operations.
 */
export function decodeBase62(str: string): Uint8Array {
  if (str.length !== KSUID_STRING_LEN) {
    throw new ParseError(
      'KSUID_INVALID_LENGTH',
      `KSUID string must be ${KSUID_STRING_LEN} characters, got ${str.length}`,
    )
  }

  // Convert Base62 string to BigInt
  let num = 0n
  for (let i = 0; i < KSUID_STRING_LEN; i += 1) {
    const value = DECODING[str.charCodeAt(i)]
    if (value === 255) {
      throw new ParseError('KSUID_INVALID_CHAR', `Invalid KSUID character: ${str[i]}`)
    }
    num = num * BASE + BigInt(value)
  }

  if (num > MAX_KSUID_VALUE) {
    throw new ParseError('KSUID_OVERFLOW', 'KSUID string exceeds 160-bit range')
  }

  // Convert BigInt to bytes (big-endian)
  const bytes = new Uint8Array(KSUID_BYTES)
  for (let i = KSUID_BYTES - 1; i >= 0; i -= 1) {
    bytes[i] = Number(num & 0xffn)
    num = num >> 8n
  }

  return bytes
}
