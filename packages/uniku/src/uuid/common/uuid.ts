import { HEX_TABLE, hexToBytes } from './hex'

const UUID_BYTE_LENGTH = 16
const UUID_STRING_LENGTH = 36

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
    throw new Error('uuid string must be 36 characters')
  }

  // Validate separator positions directly (more efficient than full loop)
  if (value[8] !== '-' || value[13] !== '-' || value[18] !== '-' || value[23] !== '-') {
    throw new Error('uuid string has invalid separators')
  }

  const hex = value.slice(0, 8) + value.slice(9, 13) + value.slice(14, 18) + value.slice(19, 23) + value.slice(24)

  const bytes = new Uint8Array(UUID_BYTE_LENGTH)
  hexToBytes(hex, bytes)
  return bytes
}
