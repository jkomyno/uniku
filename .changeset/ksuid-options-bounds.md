---
"uniku": patch
---

Fix KSUID timestamp option handling so `secs` validation is non-mutating and rejects values outside the KSUID 32-bit timestamp range.
