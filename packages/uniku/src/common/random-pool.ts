/**
 * Thread-safe random byte pool using Atomics (when SharedArrayBuffer is available).
 * Falls back to regular pooling in environments without SharedArrayBuffer.
 *
 * This module provides high-performance random byte generation by:
 * 1. Pre-allocating a pool of random bytes (128x the typical request)
 * 2. Using Atomics for thread-safe access in Web Worker scenarios
 * 3. Lazy initialization to maintain `sideEffects: false` compatibility
 */

const POOL_SIZE_MULTIPLIER = 128
const POOL_HEADER_SIZE = 4 // 4 bytes for Int32 offset counter

// Pool state - lazily initialized on first use
let sharedBuffer: SharedArrayBuffer | ArrayBuffer | undefined
let _poolBytes: Uint8Array | undefined
let poolOffset: Int32Array | undefined
let useAtomics = false

/**
 * Initialize the pool lazily. Uses SharedArrayBuffer + Atomics when available
 * for thread-safety in Web Worker scenarios.
 */
function initPool(minSize: number): void {
  const poolSize = minSize * POOL_SIZE_MULTIPLIER
  const totalSize = POOL_HEADER_SIZE + poolSize

  // Try SharedArrayBuffer first (thread-safe with Atomics)
  if (typeof SharedArrayBuffer !== 'undefined') {
    try {
      sharedBuffer = new SharedArrayBuffer(totalSize)
      useAtomics = true
    } catch {
      // SharedArrayBuffer may be disabled (security restrictions)
      sharedBuffer = new ArrayBuffer(totalSize)
      useAtomics = false
    }
  } else {
    sharedBuffer = new ArrayBuffer(totalSize)
    useAtomics = false
  }

  // First 4 bytes = atomic offset counter, rest = random bytes
  poolOffset = new Int32Array(sharedBuffer, 0, 1)
  _poolBytes = new Uint8Array(sharedBuffer, POOL_HEADER_SIZE)
  crypto.getRandomValues(_poolBytes)
}

/**
 * Get pooled random bytes. Thread-safe when SharedArrayBuffer is available.
 * Returns the starting index in the pool for the requested bytes.
 *
 * Use this with `poolBytes` for direct indexing (fastest path).
 *
 * @example
 * ```ts
 * const offset = getPooledBytes(21)
 * for (let i = offset; i < offset + 21; i++) {
 *   // Use poolBytes[i]
 * }
 * ```
 */
export function getPooledBytes(bytes: number): number {
  // Lazy initialization
  if (!_poolBytes || _poolBytes.length < bytes) {
    initPool(bytes)
  }

  if (useAtomics) {
    // Thread-safe path using Atomics
    // Use Atomics.add which is faster than compareExchange for simple increment
    const startOffset = Atomics.add(poolOffset!, 0, bytes)

    if (startOffset + bytes <= _poolBytes!.length) {
      // Fast path: we got valid bytes
      return startOffset
    }

    // Pool exhausted - need to refill
    // Use compareExchange to ensure only one thread refills
    // Try to reset offset to `bytes` (claiming first chunk after refill)
    const resetResult = Atomics.compareExchange(poolOffset!, 0, startOffset + bytes, bytes)
    if (resetResult === startOffset + bytes) {
      // We won the race - refill the pool
      crypto.getRandomValues(_poolBytes!)
      return 0 // We claimed offset 0
    }

    // Another thread is refilling or already refilled - retry
    return getPooledBytes(bytes)
  } else {
    // Single-threaded path (no Atomics needed)
    let currentOffset = poolOffset![0]

    if (currentOffset + bytes > _poolBytes!.length) {
      crypto.getRandomValues(_poolBytes!)
      currentOffset = 0
    }

    poolOffset![0] = currentOffset + bytes
    return currentOffset
  }
}

/**
 * Access to the pool buffer for direct indexing.
 * Must be used after calling `getPooledBytes()`.
 *
 * Note: Returns undefined before first `getPooledBytes()` call.
 */
export function poolBytes(): Uint8Array {
  return _poolBytes!
}

/**
 * Get a Uint8Array of random bytes from the pool.
 * This is a convenience wrapper that returns a subarray view.
 *
 * Use this when you need a Uint8Array (e.g., for UUID/ULID generation).
 * For direct indexing (nanoid), use `getPooledBytes()` + `poolBytes()` instead.
 *
 * @example
 * ```ts
 * const bytes = getRandomBytes(16) // For UUID
 * ```
 */
export function getRandomBytes(count: number): Uint8Array {
  const offset = getPooledBytes(count)
  return _poolBytes!.subarray(offset, offset + count)
}

/**
 * Fill the provided buffer with random bytes from the pool.
 * This is for compatibility with existing code that passes a buffer to fill.
 *
 * @example
 * ```ts
 * const buf = new Uint8Array(16)
 * fillRandomBytes(buf)
 * ```
 */
export function fillRandomBytes(out: Uint8Array): void {
  const offset = getPooledBytes(out.length)
  out.set(_poolBytes!.subarray(offset, offset + out.length))
}
