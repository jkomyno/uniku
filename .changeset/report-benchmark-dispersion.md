---
"uniku": patch
---

docs(bench): report benchmark dispersion and stop overstating ratios

The performance guide published ratios to two significant figures without any
measure of uncertainty, which implied a precision the harness does not have. Two
runs of the same command on one machine move the small-ratio rows by up to 22%,
and a different machine moves the ULID row from 163x to about 85x.

- `bench-summary` now prints a `Spread` column computed from each row's
  `withinActionRme`/`crossActionRme`, and labels a row `parity (within spread)`
  when its deviation from 1x is smaller than the ratio's combined dispersion.
  Snapshots without multi-run data show `—` instead of a fabricated number.
- `bench-results.ts` gains `benchmarkDispersion`, `combineDispersion`, and
  `isRatioWithinDispersion`. Dispersion prefers multi-run figures over a single
  run's RME and combines in quadrature; the parity band is multiplicative
  (`1 / (1 + s)` to `1 + s`), because a relative dispersion scales with the value it
  describes. A symmetric absolute band would call `0.75x` parity while calling its
  reciprocal `1.33x` faster, and at 100% spread it would call even `0.001x` parity.
- The performance guide reports ranges rounded to about one significant figure and
  states what each row does and does not compare. In particular the UUID v4 row
  compares the same native primitive behind two different wrappers — uniku's cached
  bound function against `uuid@14.0.3` re-reading `crypto.randomUUID` on every call
  — so it measures wrapper overhead, not generation speed, and it is the row that
  moved most between runs. The ULID row is qualified on both sides: the reference
  re-detects its PRNG and draws 16 single bytes per call, while uniku draws once per
  millisecond and increments the existing tail. Provenance of the range endpoints is
  spelled out, including which ones are not published artefacts.
