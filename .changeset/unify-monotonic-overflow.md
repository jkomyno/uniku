---
"uniku": minor
---

fix(ulid): advance virtual time when the monotonic random portion overflows

ULID handled exhaustion of its 80-bit monotonic random portion by filling the
remaining random bytes with `0xff` and throwing `RANDOM_OVERFLOW`, which left the
generator failing for every later call in that millisecond. UUID v7 handled the
same situation by advancing its timestamp by one millisecond.

There is now one policy: both generators advance virtual time by one millisecond
and continue from a zeroed counter, so subsequent calls stay unique and
monotonic instead of throwing.

Neither generator guards that advance against the end of the 48-bit timestamp
field, which was a latent bug in both: at the maximum millisecond, uuidv7 wrote a
timestamp that silently wrapped to zero, and ULID emitted a string its own
`isValid()` rejects (or, through the buffer path, also wrapped the timestamp).
Both now saturate and throw `TIMESTAMP_OUT_OF_RANGE` instead of emitting an ID
whose timestamp field overflowed.

`RANDOM_OVERFLOW` was unreachable in practice (1 in 2^80 per millisecond) and is
removed from `ERROR_CODES`. This is a pre-1.0 breaking change to the error
catalog: `ERROR_CODES` no longer contains it, and the
`ULID_RANDOM_OVERFLOW` → `RANDOM_OVERFLOW` row is gone from the v1 migration
guide.
