---
"uniku": patch
---

Remove the `secs`, `seq`, and Nanoid object-form `size` aliases, deprecated in `0.6.0` and retained through `0.9.0`. Use `msecs`, `counter`, and `length` instead. `CONFLICTING_OPTIONS` is also removed from the v1 error-code catalog because no supported option pair conflicts after these aliases are gone.
