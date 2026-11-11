---
"uniku": major
---

Finalize the v1 public API: use only `uniku/cuid/v2` with `cuidv2`, replace second-based `secs` options with millisecond-based `msecs`, replace UUID v7 and TypeID `seq` with `counter`, and use `length` for Nanoid's object-form option. Existing identifier data remains valid; see the v1 migration guide for mechanical before-and-after examples.
