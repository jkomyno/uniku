// Simple, fast random byte pool for UUID generation.
// Uses plain JavaScript for maximum performance - no Atomics overhead.
// Thread safety is not needed for typical UUID use cases.

const POOL_SIZE = 256 // uuid npm uses 256 bytes
const rnds8Pool = new Uint8Array(POOL_SIZE)
let poolPtr = POOL_SIZE // Start exhausted to trigger first fill

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Uses a pre-filled pool to minimize crypto API calls.
 */
export function rng(): Uint8Array {
  if (poolPtr > POOL_SIZE - 16) {
    crypto.getRandomValues(rnds8Pool)
    poolPtr = 0
  }
  // Return a view - consumed synchronously within the same v7 call
  const start = poolPtr
  poolPtr += 16
  return rnds8Pool.subarray(start, poolPtr)
}

/**
 * Fill the provided buffer with random bytes from the pool.
 */
export function randomBytes(out: Uint8Array): void {
  const count = out.length
  if (poolPtr > POOL_SIZE - count) {
    crypto.getRandomValues(rnds8Pool)
    poolPtr = 0
  }
  out.set(rnds8Pool.subarray(poolPtr, poolPtr + count))
  poolPtr += count
}
