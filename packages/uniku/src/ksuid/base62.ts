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
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE = 62n
const KSUID_BYTES = 20
const KSUID_STRING_LEN = 27

// Pre-computed decode table indexed by ASCII code (0-127)
// Uses Uint8Array for cache-efficient lookups via charCodeAt
// Note: Base62 is case-sensitive - 'A' (value 10) and 'a' (value 36) are different
const DECODING = new Uint8Array(128)
DECODING.fill(255) // 255 = invalid marker

for (let i = 0; i < ALPHABET.length; i += 1) {
  DECODING[ALPHABET.charCodeAt(i)] = i
}

/**
 * Encode a 20-byte KSUID to a 27-character Base62 string.
 *
 * Algorithm: Convert the 160-bit number to base 62 using BigInt.
 * V8 has highly optimized BigInt operations for this size.
 */
export function encodeBase62(bytes: Uint8Array): string {
  if (bytes.length < KSUID_BYTES) {
    throw new Error(`KSUID bytes must be at least ${KSUID_BYTES} bytes, got ${bytes.length}`)
  }

  // Convert bytes to BigInt (big-endian)
  let num = 0n
  for (let i = 0; i < KSUID_BYTES; i += 1) {
    num = (num << 8n) | BigInt(bytes[i])
  }

  // Convert to Base62 string (build from right to left)
  // Direct string concatenation is faster than array + join in V8
  let result = ''
  for (let i = 0; i < KSUID_STRING_LEN; i += 1) {
    result = ALPHABET[Number(num % BASE)] + result
    num = num / BASE
  }

  return result
}

/**
 * Decode a 27-character Base62 string to a 20-byte KSUID.
 *
 * Algorithm: Convert Base62 string to BigInt, then to bytes.
 * V8 has highly optimized BigInt operations.
 */
export function decodeBase62(str: string): Uint8Array {
  if (str.length !== KSUID_STRING_LEN) {
    throw new Error(`KSUID string must be ${KSUID_STRING_LEN} characters, got ${str.length}`)
  }

  // Convert Base62 string to BigInt
  let num = 0n
  for (let i = 0; i < KSUID_STRING_LEN; i += 1) {
    const code = str.charCodeAt(i)
    if (code >= 128) {
      throw new Error(`Invalid KSUID character: ${str[i]}`)
    }
    const value = DECODING[code]
    if (value === 255) {
      throw new Error(`Invalid KSUID character: ${str[i]}`)
    }
    num = num * BASE + BigInt(value)
  }

  // Convert BigInt to bytes (big-endian)
  const bytes = new Uint8Array(KSUID_BYTES)
  for (let i = KSUID_BYTES - 1; i >= 0; i -= 1) {
    bytes[i] = Number(num & 0xffn)
    num = num >> 8n
  }

  return bytes
}
