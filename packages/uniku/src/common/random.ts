const randomFill = /*@__PURE__*/ globalThis.crypto.getRandomValues.bind(globalThis.crypto)

/**
 * Simple random byte pool for ID generation.
 *
 * Module-level state is per JavaScript isolate, so SharedArrayBuffer and Atomics
 * only add overhead here. Returned views are consumed synchronously by callers.
 */

const POOL_SIZE = 256
const pool = new Uint8Array(POOL_SIZE)
let poolOffset = POOL_SIZE

function refillPool(): void {
  randomFill(pool)
  poolOffset = 0
}

/**
 * Return a view of `count` random bytes from the pool.
 */
export function randomBytes(count: number): Uint8Array {
  if (count > POOL_SIZE) {
    return randomFill(new Uint8Array(count))
  }

  if (poolOffset + count > POOL_SIZE) {
    refillPool()
  }

  const start = poolOffset
  poolOffset += count
  return pool.subarray(start, poolOffset)
}

/**
 * Generate a random unsigned 32-bit integer from the shared pool.
 */
export function randomUint32(): number {
  if (poolOffset > POOL_SIZE - 4) {
    refillPool()
  }

  const value =
    (pool[poolOffset] * 0x1000000 +
      pool[poolOffset + 1] * 0x10000 +
      pool[poolOffset + 2] * 0x100 +
      pool[poolOffset + 3]) >>>
    0
  poolOffset += 4
  return value
}

/**
 * Generate 16 bytes of cryptographically strong random data.
 * Uses a pre-filled pool to minimize crypto API calls.
 */
export function rng(): Uint8Array {
  if (poolOffset > POOL_SIZE - 16) {
    refillPool()
  }

  const start = poolOffset
  poolOffset += 16
  return pool.subarray(start, poolOffset)
}
