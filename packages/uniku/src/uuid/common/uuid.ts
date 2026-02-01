import { bytesToHex, hexToBytes } from './hex'

const UUID_BYTE_LENGTH = 16
const UUID_STRING_LENGTH = 36

export function formatUuid(bytes: Uint8Array): string {
  // precondition: bytes.length === UUID_BYTE_LENGTH
  const hex = bytesToHex(bytes)

  // Build UUID string with dashes at positions 8, 13, 18, 23
  // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
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
