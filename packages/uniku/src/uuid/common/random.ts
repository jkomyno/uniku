import { fillRandomBytes, getRandomBytes } from '../../common/random-pool'

export function randomBytes(out: Uint8Array): void {
  fillRandomBytes(out)
}

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Used internally by UUID generators.
 */
export function rng(): Uint8Array {
  return getRandomBytes(16)
}
