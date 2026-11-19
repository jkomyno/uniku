import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{t}from"./jsx-runtime-By8HlURe.js";var n=e(t()),r={title:`Performance and bundle size`,description:`Recorded generation benchmarks, measurement methodology, and the bundle cost of each import.`,icon:`Gauge`},i=`

Generation speed is a design constraint in uniku, so the numbers are published
rather than asserted. Results depend on the format: in this snapshot, Nanoid 6 and
BSON ObjectID generate faster than uniku, while the other measured formats favor
uniku. Application performance still depends on where and how IDs are created.

Treat every ratio on this page as an order of magnitude, not a guarantee. Read
[how to read these numbers](#how-to-read-these-numbers) before quoting one.

## Generation speed [#generation-speed]

The ranges below combine a [four-repetition CI run](https://github.com/jkomyno/uniku/actions/runs/43760726485)
on November 15, 2026 (UTC) with repeat runs of the same command on different
hardware. Node.js \`25.9.0\`, GitHub-hosted \`ubuntu-latest\` for the CI half. Each
ratio divides uniku's median throughput by the reference package's median
throughput; values above 1 favor uniku.

| Generator               | Reference                    | uniku / reference | What the row actually compares                                                  |
| ----------------------- | ---------------------------- | ----------------: | ------------------------------------------------------------------------------- |
| UUID v4                 | \`uuid@14.0.3\`                |          \\~1–1.6× | Same native primitive behind two wrappers — see below                           |
| UUID v5 (short name)    | \`uuid@14.0.3\`                |            \\~2–3× | SHA-1 over a 15-byte name                                                       |
| UUID v5 (256-char name) | \`uuid@14.0.3\`                |          \\~1.4–2× | SHA-1 over a 256-byte name                                                      |
| UUID v7                 | \`uuid@14.0.3\`                |          \\~6–7.5× | Both encode timestamp, counter, and random tail                                 |
| ULID                    | \`ulid@3.0.2\`                 |         \\~85–165× | Different random-draw strategy on both sides — see below                        |
| TypeID                  | \`typeid-js@1.2.0\`            |        \\~2.5–3.5× | uniku returns a string; the reference builds an object, then calls \`toString()\` |
| Nanoid (21 chars)       | \`nanoid@6.0.2\`               |           \\~0.65× | Both draw from a pooled random source                                           |
| Nanoid (10 chars)       | \`nanoid@6.0.2\`               |       \\~0.6–0.65× | Same, with a shorter output                                                     |
| CUID2                   | \`@paralleldrive/cuid2@3.3.0\` |            \\~7–9× | SHA3-512 over time, salt, counter, and fingerprint                              |
| KSUID                   | \`@owpz/ksuid@25.7.21\`        |        \\~1.5–1.7× | uniku returns a string; the reference builds a KSUID object                     |
| ObjectID                | \`bson@7.3.4\`                 |        \\~0.6–0.7× | Both cache the process-random field and increment a 24-bit counter              |
| TSID                    | \`tsid-ts@0.0.9\`              |          \\~2–2.6× | uniku returns a \`bigint\`; the reference builds a TSID object                    |
| XID                     | \`nexid@2.1.0\`                |            \\~1.3× | Both encode seconds, identity, and a 24-bit counter                             |

## How to read these numbers [#how-to-read-these-numbers]

**They are not reproducible to the digit.** Two runs of the same command on the
same machine moved the small-ratio rows by up to 22% (UUID v4, TSID, ObjectID,
XID), and a different machine moved the ULID row from 163× to \\~85×. That is why
the table reports ranges rounded to about one significant figure instead of the
four significant figures a single run prints.

A note on provenance, so the ranges are not mistaken for something better than
they are: the upper bounds come from the linked CI run, which is published and
auditable. The lower bounds and the repeat-run figures come from runs on a
maintainer machine (macOS arm64, Node.js \`25.9.0\`, same command, same commit) that
are not published as artefacts. Re-running the commands below on your own hardware
is the only way to get a number that applies to your hardware, and that is the
point — treat the table as a shape, not a scoreboard.

**The UUID v4 row compares two wrappers, not two algorithms.** Both sides end in
the same native call, but not by the same route: uniku resolves
\`crypto.randomUUID\` once at module load and calls the bound function, while
\`uuid@14.0.3\` re-reads \`crypto.randomUUID\` on every invocation. Measured on a
per-call basis that is zero property reads against two. So this row measures
wrapper overhead on top of a shared native primitive — a real cost that callers
pay, but not evidence that uniku generates UUIDs faster, and not a noise control.
It is also the row that moved most between runs (1.2× to 1.6×).

**Two rows are not like-for-like on work done.** The TypeID, KSUID, and TSID rows
compare uniku returning its primary value directly against a reference that
allocates an object first. That gap is real for callers, but it measures API shape
as much as encoding speed.

**The ULID row measures two different random-draw strategies.** \`ulid@3.0.2\` runs
\`detectPRNG()\` — feature detection plus \`detectRoot()\` — on every \`ulid()\` call,
draws its 16 random characters through 16 separate
\`getRandomValues(new Uint8Array(1))\` calls, and builds the string by prepending.
uniku draws 16 bytes once per millisecond and increments the existing 80-bit tail
for every further call in that millisecond, so most iterations of a tight
benchmark loop perform no random draw at all. Both behaviours are deliberate, and
both are part of the ratio; describing only the reference's overhead would leave
the largest number on this page under-qualified.

**Everything here is one engine.** These are Node.js numbers on V8, and several
hot paths are unrolled for it. Bun, Deno, and browser engines are covered by the
correctness matrix, not by these measurements.

## Methodology [#methodology]

The [compatibility benchmark](https://github.com/jkomyno/uniku/blob/main/packages/uniku/__tests__/bench/compat.bench.ts)
runs each implementation in a fresh process, so neither side inherits the other's
warmed JIT state or shared buffers. CI balances both launch orders across four
repetitions and reports the per-row median.

Both sides import built packages through plain Node imports, so uniku is measured
as it ships. Each sample times a batch of calls sized to last about 50 µs and
records the mean time per call. The fastest rows take tens of nanoseconds per
call, close to the timer's resolution, so timing one call at a time would mostly
measure the timer and the harness.

\`bench-results.ts\` carries the statistics:

* dispersion uses the median absolute deviation scaled by 1.4826 rather than a
  standard deviation, so one noisy runner does not dominate;
* \`withinActionRme\` describes spread across repetitions in one CI action and
  \`crossActionRme\` describes spread across historical actions;
* a regression must exceed \`max(configured threshold, 2 × combined dispersion)\`
  before it is reported, and reference-side rows never gate a change;
* \`bench-summary\` prints the combined dispersion for the ratio as a \`Spread\`
  column, and labels a row \`parity (within spread)\` when its deviation from 1× is
  smaller than that spread.

Shared-runner benchmarks stay directional. They report possible regressions
instead of blocking a release, and the deterministic build, type, test,
packed-package, runtime, and bundle checks are the actual gates.

Recorded results live in [the CI run](https://github.com/jkomyno/uniku/actions/runs/43760726485),
and the [rolling baseline](https://raw.githubusercontent.com/jkomyno/uniku/gh-benchmarks/baseline.json)
tracks later runs.

## Bundle size [#bundle-size]

Every entry point is independently importable and tree-shakeable: importing
\`uniku/ulid\` does not pull in the UUID, TypeID, or KSUID code. Sizes below were
remeasured from the current source with \`tsdown@0.22.3\`, minification, and gzip
level 9:

| Import             | Minified + gzipped |
| ------------------ | -----------------: |
| \`uniku/uuid/v4\`    |           \\~1.2 KB |
| \`uniku/uuid/v5\`    |           \\~1.8 KB |
| \`uniku/uuid/v7\`    |           \\~1.7 KB |
| \`uniku/ulid\`       |           \\~1.9 KB |
| \`uniku/typeid\`     |           \\~2.9 KB |
| \`uniku/cuid2\`      |           \\~1.0 KB |
| \`uniku/cuid/v2\`    |           \\~1.0 KB |
| \`uniku/nanoid\`     |           \\~1.2 KB |
| \`uniku/ksuid\`      |           \\~1.5 KB |
| \`uniku/objectid\`   |           \\~1.6 KB |
| \`uniku/tsid\`       |           \\~1.7 KB |
| \`uniku/xid\`        |           \\~2.1 KB |
| \`uniku/errors\`     |            \\~445 B |
| \`uniku/generators\` |            \\~101 B |

These numbers are reproducible byte-for-byte with \`pnpm bundle:summary\`.

The CUID v2 entry point imports SHA3-512 from \`@noble/hashes\`, uniku's one runtime
dependency; the size above excludes that external dependency's own weight. The
UUID v5 entry point inlines its SHA-1, so its size includes the whole hash and it
has no runtime dependency.

## Reproduce these numbers [#reproduce-these-numbers]

Run the benchmark and bundle-size tooling from the repository root:

\`\`\`sh
pnpm build
pnpm --filter uniku bench:compat
pnpm bench:summary
pnpm bundle:summary
pnpm --filter uniku bench:cold-start
\`\`\`

\`bench:compat\` runs uniku and the reference packages in separate processes;
\`bench:summary\` reads those results and prints a comparison table. CI repeats the
compatibility run four times with balanced launch orders, which is what populates
the \`Spread\` column. \`bundle:summary\` builds each entry point and reports its
minified, gzipped size. \`bench:cold-start\` measures fresh-process startup
separately from warmed generation throughput.
`,a={contents:[{heading:void 0,content:`Generation speed is a design constraint in uniku, so the numbers are published
rather than asserted. Results depend on the format: in this snapshot, Nanoid 6 and
BSON ObjectID generate faster than uniku, while the other measured formats favor
uniku. Application performance still depends on where and how IDs are created.`},{heading:void 0,content:`Treat every ratio on this page as an order of magnitude, not a guarantee. Read
how to read these numbers before quoting one.`},{heading:`generation-speed`,content:`The ranges below combine a four-repetition CI run
on November 15, 2026 (UTC) with repeat runs of the same command on different
hardware. Node.js \`25.9.0\`, GitHub-hosted \`ubuntu-latest\` for the CI half. Each
ratio divides uniku's median throughput by the reference package's median
throughput; values above 1 favor uniku.`},{heading:`generation-speed`,content:`Generator`},{heading:`generation-speed`,content:`Reference`},{heading:`generation-speed`,content:`uniku / reference`},{heading:`generation-speed`,content:`What the row actually compares`},{heading:`generation-speed`,content:`UUID v4`},{heading:`generation-speed`,content:"`uuid@14.0.3`"},{heading:`generation-speed`,content:`\\~1–1.6×`},{heading:`generation-speed`,content:`Same native primitive behind two wrappers — see below`},{heading:`generation-speed`,content:`UUID v5 (short name)`},{heading:`generation-speed`,content:"`uuid@14.0.3`"},{heading:`generation-speed`,content:`\\~2–3×`},{heading:`generation-speed`,content:`SHA-1 over a 15-byte name`},{heading:`generation-speed`,content:`UUID v5 (256-char name)`},{heading:`generation-speed`,content:"`uuid@14.0.3`"},{heading:`generation-speed`,content:`\\~1.4–2×`},{heading:`generation-speed`,content:`SHA-1 over a 256-byte name`},{heading:`generation-speed`,content:`UUID v7`},{heading:`generation-speed`,content:"`uuid@14.0.3`"},{heading:`generation-speed`,content:`\\~6–7.5×`},{heading:`generation-speed`,content:`Both encode timestamp, counter, and random tail`},{heading:`generation-speed`,content:`ULID`},{heading:`generation-speed`,content:"`ulid@3.0.2`"},{heading:`generation-speed`,content:`\\~85–165×`},{heading:`generation-speed`,content:`Different random-draw strategy on both sides — see below`},{heading:`generation-speed`,content:`TypeID`},{heading:`generation-speed`,content:"`typeid-js@1.2.0`"},{heading:`generation-speed`,content:`\\~2.5–3.5×`},{heading:`generation-speed`,content:"uniku returns a string; the reference builds an object, then calls `toString()`"},{heading:`generation-speed`,content:`Nanoid (21 chars)`},{heading:`generation-speed`,content:"`nanoid@6.0.2`"},{heading:`generation-speed`,content:`\\~0.65×`},{heading:`generation-speed`,content:`Both draw from a pooled random source`},{heading:`generation-speed`,content:`Nanoid (10 chars)`},{heading:`generation-speed`,content:"`nanoid@6.0.2`"},{heading:`generation-speed`,content:`\\~0.6–0.65×`},{heading:`generation-speed`,content:`Same, with a shorter output`},{heading:`generation-speed`,content:`CUID2`},{heading:`generation-speed`,content:"`@paralleldrive/cuid2@3.3.0`"},{heading:`generation-speed`,content:`\\~7–9×`},{heading:`generation-speed`,content:`SHA3-512 over time, salt, counter, and fingerprint`},{heading:`generation-speed`,content:`KSUID`},{heading:`generation-speed`,content:"`@owpz/ksuid@25.7.21`"},{heading:`generation-speed`,content:`\\~1.5–1.7×`},{heading:`generation-speed`,content:`uniku returns a string; the reference builds a KSUID object`},{heading:`generation-speed`,content:`ObjectID`},{heading:`generation-speed`,content:"`bson@7.3.4`"},{heading:`generation-speed`,content:`\\~0.6–0.7×`},{heading:`generation-speed`,content:`Both cache the process-random field and increment a 24-bit counter`},{heading:`generation-speed`,content:`TSID`},{heading:`generation-speed`,content:"`tsid-ts@0.0.9`"},{heading:`generation-speed`,content:`\\~2–2.6×`},{heading:`generation-speed`,content:"uniku returns a `bigint`; the reference builds a TSID object"},{heading:`generation-speed`,content:`XID`},{heading:`generation-speed`,content:"`nexid@2.1.0`"},{heading:`generation-speed`,content:`\\~1.3×`},{heading:`generation-speed`,content:`Both encode seconds, identity, and a 24-bit counter`},{heading:`how-to-read-these-numbers`,content:`**They are not reproducible to the digit.** Two runs of the same command on the
same machine moved the small-ratio rows by up to 22% (UUID v4, TSID, ObjectID,
XID), and a different machine moved the ULID row from 163× to \\~85×. That is why
the table reports ranges rounded to about one significant figure instead of the
four significant figures a single run prints.`},{heading:`how-to-read-these-numbers`,content:`A note on provenance, so the ranges are not mistaken for something better than
they are: the upper bounds come from the linked CI run, which is published and
auditable. The lower bounds and the repeat-run figures come from runs on a
maintainer machine (macOS arm64, Node.js \`25.9.0\`, same command, same commit) that
are not published as artefacts. Re-running the commands below on your own hardware
is the only way to get a number that applies to your hardware, and that is the
point — treat the table as a shape, not a scoreboard.`},{heading:`how-to-read-these-numbers`,content:`**The UUID v4 row compares two wrappers, not two algorithms.** Both sides end in
the same native call, but not by the same route: uniku resolves
\`crypto.randomUUID\` once at module load and calls the bound function, while
\`uuid@14.0.3\` re-reads \`crypto.randomUUID\` on every invocation. Measured on a
per-call basis that is zero property reads against two. So this row measures
wrapper overhead on top of a shared native primitive — a real cost that callers
pay, but not evidence that uniku generates UUIDs faster, and not a noise control.
It is also the row that moved most between runs (1.2× to 1.6×).`},{heading:`how-to-read-these-numbers`,content:`**Two rows are not like-for-like on work done.** The TypeID, KSUID, and TSID rows
compare uniku returning its primary value directly against a reference that
allocates an object first. That gap is real for callers, but it measures API shape
as much as encoding speed.`},{heading:`how-to-read-these-numbers`,content:"**The ULID row measures two different random-draw strategies.** `ulid@3.0.2` runs\n`detectPRNG()` — feature detection plus `detectRoot()` — on every `ulid()` call,\ndraws its 16 random characters through 16 separate\n`getRandomValues(new Uint8Array(1))` calls, and builds the string by prepending.\nuniku draws 16 bytes once per millisecond and increments the existing 80-bit tail\nfor every further call in that millisecond, so most iterations of a tight\nbenchmark loop perform no random draw at all. Both behaviours are deliberate, and\nboth are part of the ratio; describing only the reference's overhead would leave\nthe largest number on this page under-qualified."},{heading:`how-to-read-these-numbers`,content:`**Everything here is one engine.** These are Node.js numbers on V8, and several
hot paths are unrolled for it. Bun, Deno, and browser engines are covered by the
correctness matrix, not by these measurements.`},{heading:`methodology`,content:`The compatibility benchmark
runs each implementation in a fresh process, so neither side inherits the other's
warmed JIT state or shared buffers. CI balances both launch orders across four
repetitions and reports the per-row median.`},{heading:`methodology`,content:`Both sides import built packages through plain Node imports, so uniku is measured
as it ships. Each sample times a batch of calls sized to last about 50 µs and
records the mean time per call. The fastest rows take tens of nanoseconds per
call, close to the timer's resolution, so timing one call at a time would mostly
measure the timer and the harness.`},{heading:`methodology`,content:"`bench-results.ts` carries the statistics:"},{heading:`methodology`,content:`dispersion uses the median absolute deviation scaled by 1.4826 rather than a
standard deviation, so one noisy runner does not dominate;`},{heading:`methodology`,content:"`withinActionRme` describes spread across repetitions in one CI action and\n`crossActionRme` describes spread across historical actions;"},{heading:`methodology`,content:"a regression must exceed `max(configured threshold, 2 × combined dispersion)`\nbefore it is reported, and reference-side rows never gate a change;"},{heading:`methodology`,content:"`bench-summary` prints the combined dispersion for the ratio as a `Spread`\ncolumn, and labels a row `parity (within spread)` when its deviation from 1× is\nsmaller than that spread."},{heading:`methodology`,content:`Shared-runner benchmarks stay directional. They report possible regressions
instead of blocking a release, and the deterministic build, type, test,
packed-package, runtime, and bundle checks are the actual gates.`},{heading:`methodology`,content:`Recorded results live in the CI run,
and the rolling baseline
tracks later runs.`},{heading:`bundle-size`,content:"Every entry point is independently importable and tree-shakeable: importing\n`uniku/ulid` does not pull in the UUID, TypeID, or KSUID code. Sizes below were\nremeasured from the current source with `tsdown@0.22.3`, minification, and gzip\nlevel 9:"},{heading:`bundle-size`,content:`Import`},{heading:`bundle-size`,content:`Minified + gzipped`},{heading:`bundle-size`,content:"`uniku/uuid/v4`"},{heading:`bundle-size`,content:`\\~1.2 KB`},{heading:`bundle-size`,content:"`uniku/uuid/v5`"},{heading:`bundle-size`,content:`\\~1.8 KB`},{heading:`bundle-size`,content:"`uniku/uuid/v7`"},{heading:`bundle-size`,content:`\\~1.7 KB`},{heading:`bundle-size`,content:"`uniku/ulid`"},{heading:`bundle-size`,content:`\\~1.9 KB`},{heading:`bundle-size`,content:"`uniku/typeid`"},{heading:`bundle-size`,content:`\\~2.9 KB`},{heading:`bundle-size`,content:"`uniku/cuid2`"},{heading:`bundle-size`,content:`\\~1.0 KB`},{heading:`bundle-size`,content:"`uniku/cuid/v2`"},{heading:`bundle-size`,content:`\\~1.0 KB`},{heading:`bundle-size`,content:"`uniku/nanoid`"},{heading:`bundle-size`,content:`\\~1.2 KB`},{heading:`bundle-size`,content:"`uniku/ksuid`"},{heading:`bundle-size`,content:`\\~1.5 KB`},{heading:`bundle-size`,content:"`uniku/objectid`"},{heading:`bundle-size`,content:`\\~1.6 KB`},{heading:`bundle-size`,content:"`uniku/tsid`"},{heading:`bundle-size`,content:`\\~1.7 KB`},{heading:`bundle-size`,content:"`uniku/xid`"},{heading:`bundle-size`,content:`\\~2.1 KB`},{heading:`bundle-size`,content:"`uniku/errors`"},{heading:`bundle-size`,content:`\\~445 B`},{heading:`bundle-size`,content:"`uniku/generators`"},{heading:`bundle-size`,content:`\\~101 B`},{heading:`bundle-size`,content:"These numbers are reproducible byte-for-byte with `pnpm bundle:summary`."},{heading:`bundle-size`,content:`The CUID v2 entry point imports SHA3-512 from \`@noble/hashes\`, uniku's one runtime
dependency; the size above excludes that external dependency's own weight. The
UUID v5 entry point inlines its SHA-1, so its size includes the whole hash and it
has no runtime dependency.`},{heading:`reproduce-these-numbers`,content:`Run the benchmark and bundle-size tooling from the repository root:`},{heading:`reproduce-these-numbers`,content:"`bench:compat` runs uniku and the reference packages in separate processes;\n`bench:summary` reads those results and prints a comparison table. CI repeats the\ncompatibility run four times with balanced launch orders, which is what populates\nthe `Spread` column. `bundle:summary` builds each entry point and reports its\nminified, gzipped size. `bench:cold-start` measures fresh-process startup\nseparately from warmed generation throughput."}],headings:[{id:`generation-speed`,content:`Generation speed`},{id:`how-to-read-these-numbers`,content:`How to read these numbers`},{id:`methodology`,content:`Methodology`},{id:`bundle-size`,content:`Bundle size`},{id:`reproduce-these-numbers`,content:`Reproduce these numbers`}]},o=[{depth:2,url:`#generation-speed`,title:(0,n.jsx)(n.Fragment,{children:`Generation speed`})},{depth:2,url:`#how-to-read-these-numbers`,title:(0,n.jsx)(n.Fragment,{children:`How to read these numbers`})},{depth:2,url:`#methodology`,title:(0,n.jsx)(n.Fragment,{children:`Methodology`})},{depth:2,url:`#bundle-size`,title:(0,n.jsx)(n.Fragment,{children:`Bundle size`})},{depth:2,url:`#reproduce-these-numbers`,title:(0,n.jsx)(n.Fragment,{children:`Reproduce these numbers`})}];function s(e){let t={a:`a`,code:`code`,h2:`h2`,li:`li`,p:`p`,pre:`pre`,span:`span`,strong:`strong`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,ul:`ul`,...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.p,{children:`Generation speed is a design constraint in uniku, so the numbers are published
rather than asserted. Results depend on the format: in this snapshot, Nanoid 6 and
BSON ObjectID generate faster than uniku, while the other measured formats favor
uniku. Application performance still depends on where and how IDs are created.`}),`
`,(0,n.jsxs)(t.p,{children:[`Treat every ratio on this page as an order of magnitude, not a guarantee. Read
`,(0,n.jsx)(t.a,{href:`#how-to-read-these-numbers`,children:`how to read these numbers`}),` before quoting one.`]}),`
`,(0,n.jsx)(t.h2,{id:`generation-speed`,children:`Generation speed`}),`
`,(0,n.jsxs)(t.p,{children:[`The ranges below combine a `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/actions/runs/43760726485`,children:`four-repetition CI run`}),`
on November 15, 2026 (UTC) with repeat runs of the same command on different
hardware. Node.js `,(0,n.jsx)(t.code,{children:`25.9.0`}),`, GitHub-hosted `,(0,n.jsx)(t.code,{children:`ubuntu-latest`}),` for the CI half. Each
ratio divides uniku's median throughput by the reference package's median
throughput; values above 1 favor uniku.`]}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Generator`}),(0,n.jsx)(t.th,{children:`Reference`}),(0,n.jsx)(t.th,{style:{textAlign:`right`},children:`uniku / reference`}),(0,n.jsx)(t.th,{children:`What the row actually compares`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`UUID v4`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uuid@14.0.3`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1–1.6×`}),(0,n.jsx)(t.td,{children:`Same native primitive behind two wrappers — see below`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`UUID v5 (short name)`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uuid@14.0.3`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~2–3×`}),(0,n.jsx)(t.td,{children:`SHA-1 over a 15-byte name`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`UUID v5 (256-char name)`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uuid@14.0.3`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.4–2×`}),(0,n.jsx)(t.td,{children:`SHA-1 over a 256-byte name`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`UUID v7`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uuid@14.0.3`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~6–7.5×`}),(0,n.jsx)(t.td,{children:`Both encode timestamp, counter, and random tail`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`ULID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`ulid@3.0.2`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~85–165×`}),(0,n.jsx)(t.td,{children:`Different random-draw strategy on both sides — see below`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`TypeID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`typeid-js@1.2.0`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~2.5–3.5×`}),(0,n.jsxs)(t.td,{children:[`uniku returns a string; the reference builds an object, then calls `,(0,n.jsx)(t.code,{children:`toString()`})]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`Nanoid (21 chars)`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`nanoid@6.0.2`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~0.65×`}),(0,n.jsx)(t.td,{children:`Both draw from a pooled random source`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`Nanoid (10 chars)`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`nanoid@6.0.2`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~0.6–0.65×`}),(0,n.jsx)(t.td,{children:`Same, with a shorter output`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`CUID2`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`@paralleldrive/cuid2@3.3.0`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~7–9×`}),(0,n.jsx)(t.td,{children:`SHA3-512 over time, salt, counter, and fingerprint`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`KSUID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`@owpz/ksuid@25.7.21`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.5–1.7×`}),(0,n.jsx)(t.td,{children:`uniku returns a string; the reference builds a KSUID object`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`ObjectID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`bson@7.3.4`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~0.6–0.7×`}),(0,n.jsx)(t.td,{children:`Both cache the process-random field and increment a 24-bit counter`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`TSID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`tsid-ts@0.0.9`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~2–2.6×`}),(0,n.jsxs)(t.td,{children:[`uniku returns a `,(0,n.jsx)(t.code,{children:`bigint`}),`; the reference builds a TSID object`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`XID`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`nexid@2.1.0`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.3×`}),(0,n.jsx)(t.td,{children:`Both encode seconds, identity, and a 24-bit counter`})]})]})]}),`
`,(0,n.jsx)(t.h2,{id:`how-to-read-these-numbers`,children:`How to read these numbers`}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.strong,{children:`They are not reproducible to the digit.`}),` Two runs of the same command on the
same machine moved the small-ratio rows by up to 22% (UUID v4, TSID, ObjectID,
XID), and a different machine moved the ULID row from 163× to ~85×. That is why
the table reports ranges rounded to about one significant figure instead of the
four significant figures a single run prints.`]}),`
`,(0,n.jsxs)(t.p,{children:[`A note on provenance, so the ranges are not mistaken for something better than
they are: the upper bounds come from the linked CI run, which is published and
auditable. The lower bounds and the repeat-run figures come from runs on a
maintainer machine (macOS arm64, Node.js `,(0,n.jsx)(t.code,{children:`25.9.0`}),`, same command, same commit) that
are not published as artefacts. Re-running the commands below on your own hardware
is the only way to get a number that applies to your hardware, and that is the
point — treat the table as a shape, not a scoreboard.`]}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.strong,{children:`The UUID v4 row compares two wrappers, not two algorithms.`}),` Both sides end in
the same native call, but not by the same route: uniku resolves
`,(0,n.jsx)(t.code,{children:`crypto.randomUUID`}),` once at module load and calls the bound function, while
`,(0,n.jsx)(t.code,{children:`uuid@14.0.3`}),` re-reads `,(0,n.jsx)(t.code,{children:`crypto.randomUUID`}),` on every invocation. Measured on a
per-call basis that is zero property reads against two. So this row measures
wrapper overhead on top of a shared native primitive — a real cost that callers
pay, but not evidence that uniku generates UUIDs faster, and not a noise control.
It is also the row that moved most between runs (1.2× to 1.6×).`]}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.strong,{children:`Two rows are not like-for-like on work done.`}),` The TypeID, KSUID, and TSID rows
compare uniku returning its primary value directly against a reference that
allocates an object first. That gap is real for callers, but it measures API shape
as much as encoding speed.`]}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.strong,{children:`The ULID row measures two different random-draw strategies.`}),` `,(0,n.jsx)(t.code,{children:`ulid@3.0.2`}),` runs
`,(0,n.jsx)(t.code,{children:`detectPRNG()`}),` — feature detection plus `,(0,n.jsx)(t.code,{children:`detectRoot()`}),` — on every `,(0,n.jsx)(t.code,{children:`ulid()`}),` call,
draws its 16 random characters through 16 separate
`,(0,n.jsx)(t.code,{children:`getRandomValues(new Uint8Array(1))`}),` calls, and builds the string by prepending.
uniku draws 16 bytes once per millisecond and increments the existing 80-bit tail
for every further call in that millisecond, so most iterations of a tight
benchmark loop perform no random draw at all. Both behaviours are deliberate, and
both are part of the ratio; describing only the reference's overhead would leave
the largest number on this page under-qualified.`]}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.strong,{children:`Everything here is one engine.`}),` These are Node.js numbers on V8, and several
hot paths are unrolled for it. Bun, Deno, and browser engines are covered by the
correctness matrix, not by these measurements.`]}),`
`,(0,n.jsx)(t.h2,{id:`methodology`,children:`Methodology`}),`
`,(0,n.jsxs)(t.p,{children:[`The `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/blob/main/packages/uniku/__tests__/bench/compat.bench.ts`,children:`compatibility benchmark`}),`
runs each implementation in a fresh process, so neither side inherits the other's
warmed JIT state or shared buffers. CI balances both launch orders across four
repetitions and reports the per-row median.`]}),`
`,(0,n.jsx)(t.p,{children:`Both sides import built packages through plain Node imports, so uniku is measured
as it ships. Each sample times a batch of calls sized to last about 50 µs and
records the mean time per call. The fastest rows take tens of nanoseconds per
call, close to the timer's resolution, so timing one call at a time would mostly
measure the timer and the harness.`}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.code,{children:`bench-results.ts`}),` carries the statistics:`]}),`
`,(0,n.jsxs)(t.ul,{children:[`
`,(0,n.jsx)(t.li,{children:`dispersion uses the median absolute deviation scaled by 1.4826 rather than a
standard deviation, so one noisy runner does not dominate;`}),`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.code,{children:`withinActionRme`}),` describes spread across repetitions in one CI action and
`,(0,n.jsx)(t.code,{children:`crossActionRme`}),` describes spread across historical actions;`]}),`
`,(0,n.jsxs)(t.li,{children:[`a regression must exceed `,(0,n.jsx)(t.code,{children:`max(configured threshold, 2 × combined dispersion)`}),`
before it is reported, and reference-side rows never gate a change;`]}),`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.code,{children:`bench-summary`}),` prints the combined dispersion for the ratio as a `,(0,n.jsx)(t.code,{children:`Spread`}),`
column, and labels a row `,(0,n.jsx)(t.code,{children:`parity (within spread)`}),` when its deviation from 1× is
smaller than that spread.`]}),`
`]}),`
`,(0,n.jsx)(t.p,{children:`Shared-runner benchmarks stay directional. They report possible regressions
instead of blocking a release, and the deterministic build, type, test,
packed-package, runtime, and bundle checks are the actual gates.`}),`
`,(0,n.jsxs)(t.p,{children:[`Recorded results live in `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/actions/runs/43760726485`,children:`the CI run`}),`,
and the `,(0,n.jsx)(t.a,{href:`https://raw.githubusercontent.com/jkomyno/uniku/gh-benchmarks/baseline.json`,children:`rolling baseline`}),`
tracks later runs.`]}),`
`,(0,n.jsx)(t.h2,{id:`bundle-size`,children:`Bundle size`}),`
`,(0,n.jsxs)(t.p,{children:[`Every entry point is independently importable and tree-shakeable: importing
`,(0,n.jsx)(t.code,{children:`uniku/ulid`}),` does not pull in the UUID, TypeID, or KSUID code. Sizes below were
remeasured from the current source with `,(0,n.jsx)(t.code,{children:`tsdown@0.22.3`}),`, minification, and gzip
level 9:`]}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Import`}),(0,n.jsx)(t.th,{style:{textAlign:`right`},children:`Minified + gzipped`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/uuid/v4`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.2 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/uuid/v5`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.8 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/uuid/v7`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.7 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/ulid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.9 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/typeid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~2.9 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/cuid2`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.0 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/cuid/v2`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.0 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/nanoid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.2 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/ksuid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.5 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/objectid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.6 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/tsid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~1.7 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/xid`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~2.1 KB`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/errors`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~445 B`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/generators`})}),(0,n.jsx)(t.td,{style:{textAlign:`right`},children:`~101 B`})]})]})]}),`
`,(0,n.jsxs)(t.p,{children:[`These numbers are reproducible byte-for-byte with `,(0,n.jsx)(t.code,{children:`pnpm bundle:summary`}),`.`]}),`
`,(0,n.jsxs)(t.p,{children:[`The CUID v2 entry point imports SHA3-512 from `,(0,n.jsx)(t.code,{children:`@noble/hashes`}),`, uniku's one runtime
dependency; the size above excludes that external dependency's own weight. The
UUID v5 entry point inlines its SHA-1, so its size includes the whole hash and it
has no runtime dependency.`]}),`
`,(0,n.jsx)(t.h2,{id:`reproduce-these-numbers`,children:`Reproduce these numbers`}),`
`,(0,n.jsx)(t.p,{children:`Run the benchmark and bundle-size tooling from the repository root:`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` build`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --filter`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` bench:compat`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` bench:summary`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` bundle:summary`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --filter`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` bench:cold-start`})]})]})})}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.code,{children:`bench:compat`}),` runs uniku and the reference packages in separate processes;
`,(0,n.jsx)(t.code,{children:`bench:summary`}),` reads those results and prints a comparison table. CI repeats the
compatibility run four times with balanced launch orders, which is what populates
the `,(0,n.jsx)(t.code,{children:`Spread`}),` column. `,(0,n.jsx)(t.code,{children:`bundle:summary`}),` builds each entry point and reports its
minified, gzipped size. `,(0,n.jsx)(t.code,{children:`bench:cold-start`}),` measures fresh-process startup
separately from warmed generation throughput.`]})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};