---
'uniku': patch
---

Enforce the documented v1 input boundaries: numeric options and buffer offsets must be finite integers in range, `fromBytes()` requires each format's exact byte length, UUID v4 preserves caller-owned random bytes, and TSID conversions reject values outside the unsigned 64-bit range.
