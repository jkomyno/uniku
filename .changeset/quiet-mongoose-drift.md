---
"uniku": minor
---

Add `uniku/objectid`, a spec-compliant MongoDB ObjectID generator: 12-byte time-ordered IDs encoded as 24-character lowercase hex, with buffer-mode support, `toBytes`/`fromBytes` conversion, and millisecond timestamp extraction. Cross-validated against MongoDB's own `bson` package.
