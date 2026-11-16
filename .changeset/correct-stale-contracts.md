---
"uniku": minor
---

fix: correct stale comments and contracts that contradicted the code

- `nanoid(0)` and `nanoid({ length: 0 })` returned an empty string while the JSDoc
  advertised `@throws Length must be between 0 and 2048` and the CLI documented a
  `1-256` range. Length is now validated as an integer in `1..2048` with a single
  `LENGTH_OUT_OF_RANGE` message.
- `nanoid.isValid()` cannot check a generated length, because a nanoid carries none.
  Its JSDoc and reference page now say so instead of leaving the gap implicit.
- `nanoid` now reads `globalThis.crypto` like every other module, instead of the bare
  `crypto` global.
- `encodeBase62` and `encodeObjectIdHex` accepted inputs longer than the canonical
  length and silently encoded only the leading bytes. They now require the exact
  length, matching the public `fromBytes()` wrappers.
- `docs/STABILITY.md` described the ObjectID and XID counters as "always-incrementing".
  Both are 24-bit counters that wrap to zero after 2^24 values in the same second.
- Corrected the `incrementBytesInPlace` comment, which credited KSUID with a call
  KSUID never makes, and the `objectid/hex.ts` decoding-table comment, which reported
  128 KiB for a 64 KiB allocation.
