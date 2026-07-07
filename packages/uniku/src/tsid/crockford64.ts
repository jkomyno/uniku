import { ParseError } from '../errors'

/**
 * Crockford Base32 codec for TSID, operating directly on the primary `bigint`
 * value rather than an intermediate byte array (unlike ulid/crockford.ts) -
 * tsid's primary type never routes through a `Uint8Array` during string
 * conversion.
 *
 * TSID binary format: 64 bits (8 bytes), encoded as 13 Crockford Base32 characters.
 * 13 chars * 5 bits = 65 bits of capacity for a 64-bit value, leaving exactly 1 bit
 * of headroom on the leading character. That headroom bit is always 0, so the
 * leading character only carries 4 significant real bits (values 0-15, i.e. the
 * alphabet's first 16 symbols "0"-"9"/"A"-"F") rather than the full 32-symbol
 * range - the same overflow-prevention technique ULID uses for its own leading
 * `[0-7]` restriction (2 headroom bits there vs 1 here). Confirmed against
 * `tsid-ts`'s own `toCanonicalString`: `(number >> BigInt(60 - i * 5)) & 0x1f`.
 */

const TSID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const TSID_STRING_LEN = 13
const TSID_LEADING_MAX = 15 // 4 significant bits on the leading character (see above)

// Pre-computed decode table (case-insensitive) covering ASCII, so lookups never
// go out of bounds and a single `=== 255` check rejects invalid input.
const DECODING = new Uint8Array(128).fill(255)
for (let i = 0; i < TSID_ALPHABET.length; i += 1) {
  const char = TSID_ALPHABET[i]
  const upperCode = TSID_ALPHABET.charCodeAt(i)
  DECODING[upperCode] = i
  // Only letters have a lowercase counterpart - applying +32 to digit codes
  // would land on unrelated uppercase letters (e.g. '5' + 32 -> 'U', which is
  // excluded from this alphabet and would never get overwritten back to 255).
  if (char >= 'A' && char <= 'Z') {
    DECODING[upperCode + 32] = i
  }
}

/**
 * Encode a TSID `bigint` value to its 13-character canonical Crockford Base32 string.
 */
export function encodeTsidString(value: bigint): string {
  let result = ''
  for (let i = 0; i < TSID_STRING_LEN; i += 1) {
    const shift = BigInt(60 - i * 5)
    const group = Number((value >> shift) & 0x1fn)
    result += TSID_ALPHABET[group]
  }
  return result
}

/**
 * Decode a 13-character canonical Crockford Base32 string to a TSID `bigint` value.
 */
export function decodeTsidString(str: string): bigint {
  if (str.length !== TSID_STRING_LEN) {
    throw new ParseError('TSID_INVALID_LENGTH', `TSID string must be ${TSID_STRING_LEN} characters, got ${str.length}`)
  }

  let value = 0n
  for (let i = 0; i < TSID_STRING_LEN; i += 1) {
    const code = str.charCodeAt(i)
    const group = code < 128 ? DECODING[code] : 255
    if (group === 255) {
      throw new ParseError('TSID_INVALID_CHAR', `Invalid TSID character: ${str[i]}`)
    }
    if (i === 0 && group > TSID_LEADING_MAX) {
      throw new ParseError(
        'TSID_LEADING_CHAR_OUT_OF_RANGE',
        `TSID leading character must be one of 0-9, A-F, got: ${str[i]}`,
      )
    }
    value = (value << 5n) | BigInt(group)
  }
  return value
}
