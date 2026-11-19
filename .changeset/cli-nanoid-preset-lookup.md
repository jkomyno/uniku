---
"@uniku/cli": patch
---

Treat `--alphabet` values such as `constructor` or `toString` as literal alphabets instead of resolving them through the preset object's prototype, and reject registry responses whose `version` field is not a non-empty string during the update check.
