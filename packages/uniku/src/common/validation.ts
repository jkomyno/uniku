export function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

export function isWritableRange(buffer: Uint8Array, offset: number, byteLength: number): boolean {
  return Number.isInteger(offset) && offset >= 0 && offset + byteLength <= buffer.length
}
