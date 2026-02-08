const randomFill = /*@__PURE__*/ globalThis.crypto.getRandomValues.bind(globalThis.crypto)

/**
 * Simple, fast random byte pool for ID generation.
 * Uses plain JavaScript for maximum performance - no Atomics overhead.
 * Thread safety is not needed for typical ID generation use cases.
 */

const POOL_SIZE = 256
const rnds8Pool = new Uint8Array(POOL_SIZE)
let poolPtr = POOL_SIZE // Start exhausted to trigger first fill

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Uses a pre-filled pool to minimize crypto API calls.
 */
export function rng(): Uint8Array {
  if (poolPtr > POOL_SIZE - 16) {
    randomFill(rnds8Pool)
    poolPtr = 0
  }
  // Return a view - consumed synchronously within the same call
  const start = poolPtr
  poolPtr += 16
  return rnds8Pool.subarray(start, poolPtr)
}
