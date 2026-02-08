import { ParseError } from '../../errors'
import { hexValue } from './hex'

const UUID_BYTE_LENGTH = 16
const UUID_STRING_LENGTH = 36

// Mapping from UUID string position to byte index.
// -1 indicates a dash position that should be skipped.
// This avoids intermediate string allocations during parsing.
const UUID_CHAR_TO_BYTE: number[] = [
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3, // chars 0-7 → bytes 0-3
  -1, // char 8 is '-'
  4,
  4,
  5,
  5, // chars 9-12 → bytes 4-5
  -1, // char 13 is '-'
  6,
  6,
  7,
  7, // chars 14-17 → bytes 6-7
  -1, // char 18 is '-'
  8,
  8,
  9,
  9, // chars 19-22 → bytes 8-9
  -1, // char 23 is '-'
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  14,
  14,
  15,
  15, // chars 24-35 → bytes 10-15
]

// Whether each position is the high nibble (true) or low nibble (false)
const UUID_CHAR_IS_HIGH: boolean[] = [
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false, // chars 0-7
  false, // dash (ignored)
  true,
  false,
  true,
  false, // chars 9-12
  false, // dash
  true,
  false,
  true,
  false, // chars 14-17
  false, // dash
  true,
  false,
  true,
  false, // chars 19-22
  false, // dash
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  false, // chars 24-35
]

// Pre-computed lookup table for byte-to-hex conversion (0x00 -> "00", 0xff -> "ff")
//
// Note: this table must remain defined in the same module as `formatUuid`, otherwise the v8 optimizer
// will cause a performance drop of ~36%.
const HEX_TABLE: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function formatUuid(bytes: Uint8Array): string {
  // Direct string concatenation - optimized for V8's string builder.
  // This approach avoids loop overhead and intermediate allocations.
  // See: https://github.com/uuidjs/uuid/pull/434
  return (
    HEX_TABLE[bytes[0]] +
    HEX_TABLE[bytes[1]] +
    HEX_TABLE[bytes[2]] +
    HEX_TABLE[bytes[3]] +
    '-' +
    HEX_TABLE[bytes[4]] +
    HEX_TABLE[bytes[5]] +
    '-' +
    HEX_TABLE[bytes[6]] +
    HEX_TABLE[bytes[7]] +
    '-' +
    HEX_TABLE[bytes[8]] +
    HEX_TABLE[bytes[9]] +
    '-' +
    HEX_TABLE[bytes[10]] +
    HEX_TABLE[bytes[11]] +
    HEX_TABLE[bytes[12]] +
    HEX_TABLE[bytes[13]] +
    HEX_TABLE[bytes[14]] +
    HEX_TABLE[bytes[15]]
  )
}

export function parseUuid(value: string): Uint8Array {
  if (value.length !== UUID_STRING_LENGTH) {
    throw new ParseError('UUID_INVALID_LENGTH', `UUID string must be 36 characters, got ${value.length}`)
  }

  // Validate separator positions directly (more efficient than full loop)
  if (value[8] !== '-' || value[13] !== '-' || value[18] !== '-' || value[23] !== '-') {
    throw new ParseError(
      'UUID_INVALID_SEPARATORS',
      `UUID string has invalid separators at positions 8, 13, 18, 23. Received: "${value}"`,
    )
  }

  // Parse bytes directly from UUID string without intermediate string allocations.
  // This avoids the 9 allocations (5 slices + 4 concatenations) of the naive approach.
  const bytes = new Uint8Array(UUID_BYTE_LENGTH)

  for (let i = 0; i < UUID_STRING_LENGTH; i += 1) {
    const byteIdx = UUID_CHAR_TO_BYTE[i]
    if (byteIdx === -1) continue // Skip dash positions

    const nibble = hexValue(value.charCodeAt(i))
    if (nibble === -1) {
      throw new ParseError('UUID_INVALID_HEX_CHAR', `UUID string contains invalid hex character at position ${i}`)
    }

    if (UUID_CHAR_IS_HIGH[i]) {
      bytes[byteIdx] = nibble << 4
    } else {
      bytes[byteIdx] |= nibble
    }
  }

  return bytes
}
