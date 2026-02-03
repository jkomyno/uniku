---
"uniku": patch
---

Improve UUIDv7 performance and add Cloudflare Workers e2e tests.

### Performance

- Optimize UUIDv7 stringification for ~15% performance gain (2.7M → 3.1M ops/sec)
- Replace loop-based `bytesToHex` with direct string concatenation
- Simplify random byte pool to avoid Atomics overhead
- Reuse buffer for string generation to reduce per-call allocations

### Testing

- Add end-to-end tests for Cloudflare Workers runtime
- Add GitHub Actions workflow for Cloudflare e2e tests
