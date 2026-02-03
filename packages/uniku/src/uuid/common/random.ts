import { createPool, fillRandomBytes, getRandomBytes, type RandomPool } from '../../common/random-pool'

// UUID's own pool - lazily initialized on first use
// Shared by uuid/v4, uuid/v7, and ulid (all need 16 bytes)
let pool: RandomPool | undefined

function ensurePool(): RandomPool {
  if (!pool) pool = createPool(16)
  return pool
}

export function randomBytes(out: Uint8Array): void {
  fillRandomBytes(ensurePool(), out)
}

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Used internally by UUID generators.
 */
export function rng(): Uint8Array {
  return getRandomBytes(ensurePool(), 16)
}
