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
