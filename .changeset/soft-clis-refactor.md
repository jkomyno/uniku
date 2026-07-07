---
"@uniku/cli": patch
---

Internal maintenance, no user-facing behavior change:

- Derive the `IdType` type and the `--type` flag choices for `inspect` / `validate` from `uniku`'s canonical `ID_GENERATORS` list instead of three hand-maintained copies of the union. The `--type` values and their order are unchanged.
- Switch the CUID call sites to the new `uniku/cuid/v2` import (the `--type cuid` value and `type: 'cuid'` output field are unchanged).
