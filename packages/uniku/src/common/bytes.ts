/**
 * Common byte manipulation utilities shared across ID generators.
 */

/**
 * Increment a byte array by 1 in-place, propagating carry from LSB to MSB.
 * Mutates the input array directly - no allocation.
 *
 * Used by ULID and KSUID for monotonic ordering within the same time unit.
 *
 * @returns true if increment succeeded, false if all bytes overflowed to 0
 */
export function incrementBytesInPlace(bytes: Uint8Array): boolean {
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    if (bytes[i] < 255) {
      bytes[i] += 1
      return true
    }
    bytes[i] = 0
  }

  // All bytes overflowed to 0 - astronomically unlikely (1 in 2^80 for ULID, 1 in 2^128 for KSUID)
  return false
}

/**
 * Write a 48-bit timestamp as big-endian bytes.
 * Used by UUID v7 and ULID for millisecond-precision timestamps.
 *
 * @param buf - Target buffer
 * @param offset - Starting byte offset
 * @param msecs - Milliseconds since Unix epoch (must fit in 48 bits)
 */
export function writeTimestamp48(buf: Uint8Array, offset: number, msecs: number): void {
  buf[offset] = (msecs / 0x10000000000) & 0xff
  buf[offset + 1] = (msecs / 0x100000000) & 0xff
  buf[offset + 2] = (msecs / 0x1000000) & 0xff
  buf[offset + 3] = (msecs / 0x10000) & 0xff
  buf[offset + 4] = (msecs / 0x100) & 0xff
  buf[offset + 5] = msecs & 0xff
}

/**
 * Write a 32-bit timestamp as big-endian bytes.
 * Used by KSUID for second-precision timestamps.
 *
 * `writeTimestamp32(buf, offset, timestamp)` is equivalent to `new DataView(buf.buffer, offset, 4).setUint32(offset, timestamp, false)`,
 * but it's faster because it doesn't require creating a DataView object.
 *
 * @param buf - Target buffer
 * @param offset - Starting byte offset
 * @param secs - Seconds (must fit in 32 bits)
 */
export function writeTimestamp32(buf: Uint8Array, offset: number, secs: number): void {
  buf[offset] = (secs >>> 24) & 0xff
  buf[offset + 1] = (secs >>> 16) & 0xff
  buf[offset + 2] = (secs >>> 8) & 0xff
  buf[offset + 3] = secs & 0xff
}
