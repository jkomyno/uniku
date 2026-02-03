/**
 * Thread-safe random byte pool utilities using Atomics (when SharedArrayBuffer is available).
 * Falls back to regular pooling in environments without SharedArrayBuffer.
 *
 * This module provides STATELESS utilities - each consumer creates and manages its own pool.
 * Pass the pool state to each function (C-style) for explicit, predictable behavior.
 *
 * @example
 * ```ts
 * // Each module creates its own pool
 * let pool: RandomPool | undefined
 *
 * function getBytes(count: number): number {
 *   if (!pool) pool = createPool(count)
 *   return getPooledBytes(pool, count)
 * }
 * ```
 */

const POOL_SIZE_MULTIPLIER = 128
const POOL_HEADER_SIZE = 4 // 4 bytes for Int32 offset counter

/**
 * Pool state - passed to all pool functions.
 * Each module creates and owns its own pool instance.
 */
export type RandomPool = {
  buffer: SharedArrayBuffer | ArrayBuffer
  bytes: Uint8Array
  offset: Int32Array
  useAtomics: boolean
}

/**
 * Create a new random pool. Uses SharedArrayBuffer + Atomics when available
 * for thread-safety in Web Worker scenarios.
 *
 * @param minSize - Minimum bytes needed per request (pool = minSize * 128)
 */
export function createPool(minSize: number): RandomPool {
  const poolSize = minSize * POOL_SIZE_MULTIPLIER
  const totalSize = POOL_HEADER_SIZE + poolSize

  let buffer: SharedArrayBuffer | ArrayBuffer
  let useAtomics = false

  // Try SharedArrayBuffer first (thread-safe with Atomics)
  if (typeof SharedArrayBuffer !== 'undefined') {
    try {
      buffer = new SharedArrayBuffer(totalSize)
      useAtomics = true
    } catch {
      // SharedArrayBuffer may be disabled (security restrictions)
      buffer = new ArrayBuffer(totalSize)
    }
  } else {
    buffer = new ArrayBuffer(totalSize)
  }

  // First 4 bytes = atomic offset counter, rest = random bytes
  const offset = new Int32Array(buffer, 0, 1)
  const bytes = new Uint8Array(buffer, POOL_HEADER_SIZE)
  crypto.getRandomValues(bytes)

  return { buffer, bytes, offset, useAtomics }
}

/**
 * Get pooled random bytes. Thread-safe when SharedArrayBuffer is available.
 * Returns the starting index in the pool for the requested bytes.
 *
 * @param pool - The pool state (from createPool)
 * @param count - Number of bytes needed
 * @returns Starting offset in pool.bytes
 *
 * @example
 * ```ts
 * const offset = getPooledBytes(pool, 21)
 * for (let i = offset; i < offset + 21; i++) {
 *   // Use pool.bytes[i]
 * }
 * ```
 */
export function getPooledBytes(pool: RandomPool, count: number): number {
  if (pool.useAtomics) {
    // Thread-safe path using Atomics
    const startOffset = Atomics.add(pool.offset, 0, count)

    if (startOffset + count <= pool.bytes.length) {
      return startOffset
    }

    // Pool exhausted - need to refill
    // Use compareExchange to ensure only one thread refills
    const resetResult = Atomics.compareExchange(pool.offset, 0, startOffset + count, count)
    if (resetResult === startOffset + count) {
      // We won the race - refill the pool
      crypto.getRandomValues(pool.bytes)
      return 0
    }

    // Another thread is refilling or already refilled - retry
    return getPooledBytes(pool, count)
  } else {
    // Single-threaded path
    let currentOffset = pool.offset[0]

    if (currentOffset + count > pool.bytes.length) {
      crypto.getRandomValues(pool.bytes)
      currentOffset = 0
    }

    pool.offset[0] = currentOffset + count
    return currentOffset
  }
}

/**
 * Get a Uint8Array slice of random bytes from the pool.
 *
 * Note: Returns a subarray VIEW into the pool. If you need the bytes to persist
 * beyond the current synchronous operation, use getRandomBytesCopy() instead.
 *
 * @param pool - The pool state
 * @param count - Number of bytes needed
 */
export function getRandomBytes(pool: RandomPool, count: number): Uint8Array {
  const offset = getPooledBytes(pool, count)
  return pool.bytes.subarray(offset, offset + count)
}

/**
 * Get a COPY of random bytes from the pool.
 * Use this when bytes need to persist (e.g., returned to caller who may use them later).
 *
 * @param pool - The pool state
 * @param count - Number of bytes needed
 */
export function getRandomBytesCopy(pool: RandomPool, count: number): Uint8Array {
  const offset = getPooledBytes(pool, count)
  return pool.bytes.slice(offset, offset + count)
}

/**
 * Fill the provided buffer with random bytes from the pool.
 *
 * @param pool - The pool state
 * @param out - Buffer to fill
 */
export function fillRandomBytes(pool: RandomPool, out: Uint8Array): void {
  const offset = getPooledBytes(pool, out.length)
  out.set(pool.bytes.subarray(offset, offset + out.length))
}
