---
"uniku": patch
---

Fix UUID v7 monotonic sequence rollover so same-millisecond IDs advance the embedded timestamp when the 31-bit sequence is exhausted.
