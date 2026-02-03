# uniku

## 0.0.6

### Patch Changes

- 1c776b2: Improved performance of nanoid, add bundle:packages script to view size impact

## 0.0.5

### Patch Changes

- 11c26ab: Improve UUIDv7 performance and add Cloudflare Workers e2e tests.

  ### Performance

  - Optimize UUIDv7 stringification for ~15% performance gain (2.7M → 3.1M ops/sec)
  - Replace loop-based `bytesToHex` with direct string concatenation
  - Simplify random byte pool to avoid Atomics overhead
  - Reuse buffer for string generation to reduce per-call allocations

  ### Testing

  - Add end-to-end tests for Cloudflare Workers runtime
  - Add GitHub Actions workflow for Cloudflare e2e tests

## 0.0.4

### Patch Changes

- 47179ec: Add nanoid support

## 0.0.3

### Patch Changes

- ad494ba: Add cuid v2 support

## 0.0.2

### Patch Changes

- ba28bbe: Add support for ulid. Add timestamp method to uuid v7, ulid. Add isValid method to uuid v4, uuid v4, ulid.

## 0.0.1

### Patch Changes

- 3c3b9c8: Add support for uuid v4, v7. Each ID generator function provides a factory function, a `.fromBytes()` function, and a `.toBytes()` function.
