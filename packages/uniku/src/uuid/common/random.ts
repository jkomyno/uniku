export function randomBytes(out: Uint8Array): void {
  const crypto = globalThis.crypto
  crypto.getRandomValues(out)
}

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Used internally by UUID generators.
 */
export function rng(): Uint8Array {
  const bytes = new Uint8Array(16)
  randomBytes(bytes)
  return bytes
}
