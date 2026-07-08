---
"uniku": minor
---

Add two new entry points:

- `uniku/generators` exports `ID_GENERATORS` (the canonical ordered list of the 8 supported ID generators) and its derived `IdGenerator` union — a single source of truth for the set of supported generators.
- `uniku/cuid/v2` exports the CUID2 generator as `cuidv2`, mirroring the versioned-subpath convention of `uniku/uuid/v4` / `uniku/uuid/v7`.

The existing `uniku/cuid2` entry point keeps working unchanged but is now `@deprecated` in favor of `uniku/cuid/v2`.
