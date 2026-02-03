// Pre-computed lookup table for byte-to-hex conversion (0x00 -> "00", 0xff -> "ff")
export const HEX_TABLE: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function bytesToHex(bytes: Uint8Array): string {
  // Build string directly, without intermediate array allocation
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) {
    hex += HEX_TABLE[bytes[i]]
  }
  return hex
}

// ASCII code ranges for hex character validation
const ASCII_0 = 48 // '0'
const ASCII_9 = 57 // '9'
const ASCII_A = 65 // 'A'
const ASCII_F = 70 // 'F'
const ASCII_a = 97 // 'a'
const ASCII_f = 102 // 'f'

/**
 * Convert a hex character ASCII code to its numeric value (0-15).
 * Returns -1 for invalid hex characters.
 */
export function hexValue(code: number): number {
  if (code >= ASCII_0 && code <= ASCII_9) {
    return code - ASCII_0
  }
  if (code >= ASCII_A && code <= ASCII_F) {
    return code - ASCII_A + 10
  }
  if (code >= ASCII_a && code <= ASCII_f) {
    return code - ASCII_a + 10
  }
  return -1 // Invalid hex character
}

export function hexToBytes(hex: string, out: Uint8Array): void {
  if (hex.length !== out.length * 2) {
    throw new Error(`hex string must be ${out.length * 2} chars, got ${hex.length}`)
  }

  for (let i = 0; i < out.length; i += 1) {
    const hi = hexValue(hex.charCodeAt(i * 2))
    const lo = hexValue(hex.charCodeAt(i * 2 + 1))
    if (hi === -1 || lo === -1) {
      throw new Error('hex string contains invalid characters')
    }
    out[i] = (hi << 4) | lo
  }
}
