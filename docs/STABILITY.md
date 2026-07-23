# Stability contract

This document defines the compatibility promise that starts with `uniku@1.0.0`.
It also records the separate release policy for `@uniku/cli`.

## Release scope

`uniku` and `@uniku/cli` have independent version numbers and stability clocks.
The library may reach `1.0.0` while the CLI remains on `0.x`.

The `uniku@1.x` public entry points are:

- `uniku/uuid/v4`
- `uniku/uuid/v7`
- `uniku/ulid`
- `uniku/typeid`
- `uniku/cuid/v2`
- `uniku/nanoid`
- `uniku/ksuid`
- `uniku/objectid`
- `uniku/xid`
- `uniku/tsid`
- `uniku/errors`
- `uniku/generators`
- `uniku/package.json`

The package root remains intentionally unexported. Consumers import only the
generator or metadata module they use.

### CUID2 migration

`uniku/cuid2` is a pre-1.0 compatibility alias. It will be removed in
`uniku@1.0.0`; it is not part of the v1 contract.

```ts
// Before v1
import { cuid2 } from 'uniku/cuid2'

// v1
import { cuidv2 } from 'uniku/cuid/v2'
```

After v1, deprecated APIs remain available for the rest of their current major
version and are removed only in the next major version.

### v1-rc cleanup checklist

The following deprecated surfaces must be removed before tagging the v1
release candidate. Code-level reminders live in `TODO(v1-rc)` comments next to
each deprecated surface.

- `uniku/cuid2` entry point (see CUID2 migration above).
- `secs` timestamp options in `uniku/ksuid`, `uniku/objectid`, and `uniku/xid`
  once the unified `msecs` option lands there; retire the seconds-based
  `--timestamp` parsing in `@uniku/cli` at the same time.
- Any remaining strategy-prefixed error codes (e.g. `ULID_INVALID_CHAR`,
  `KSUID_BYTES_INVALID_LENGTH`) if the consolidation into unified codes with
  `strategy` attribution — started with `TIMESTAMP_OUT_OF_RANGE` — has not
  finished by then.

## Runtime support

The library is ESM-only and targets ES2023 plus the Web Crypto API.

The v1 compatibility matrix covers:

- Node.js `>=20.19.0`, tested at that exact floor and on the Mise-pinned latest
  Node.js 25.x release;
- current stable Bun, with the latest canary exercised in CI;
- the Mise-pinned latest stable Deno 2 release;
- Cloudflare Workers;
- current stable Chromium and compatible evergreen browsers.

Other runtimes that implement the same standards may work, but are not part of
the tested compatibility promise. Runtime support refers to the library. The
standalone CLI supports macOS x64/arm64 and Linux x64/arm64. Windows binaries
are out of scope.

## Public API behavior

Each generator keeps its standalone function-plus-methods API. Within `1.x`, a
minor or patch release will not:

- remove or rename a documented entry point, export, option, method, or
  constant;
- change a generator's primary return type or canonical string format;
- change the units of timestamps or the byte order of binary codecs;
- change the meaning of a documented error code;
- add a root barrel that makes unused generators part of an import graph.

New generators and additive methods may ship in minor releases when they keep
existing entry points isolated and tree-shakeable.

### Input boundaries

Public numeric inputs must be finite integers within the format's documented
range. This includes timestamps, sequence values, counters, node IDs, lengths,
sizes, and buffer offsets. Invalid values fail with a typed `UniqueIdError`;
they are never clamped, truncated, or wrapped silently.

`fromBytes()` requires the format's exact canonical byte length. Buffer-writing
generator overloads may accept larger destination buffers, but the offset must
be a non-negative integer and the full ID must fit.

Caller-owned random byte arrays and destination buffers have distinct rules:

- random input is read without mutation;
- an explicitly supplied destination buffer is mutated only inside the
  requested byte range;
- generator state is bypassed when explicit deterministic options are
  supplied.

### Errors

Public failures use `InvalidInputError`, `ParseError`, or `BufferError` from
`uniku/errors`. Their `_tag` and `code` fields are machine-readable API. Error
messages help people diagnose a failure but may be clarified in minor releases.

Every documented error code is stable throughout `1.x`. New codes may be added
for new APIs or newly rejected invalid inputs.

### Monotonic state

Time-ordered generators keep module-local state where their format needs it.
The state belongs to one JavaScript isolate and may survive serverless warm
starts.

- UUID v7 and ULID preserve monotonic order when the wall clock stalls or moves
  backward.
- ObjectID keeps its process-random field and always-incrementing counter.
- XID keeps a random per-runtime identity and always-incrementing counter.
- TSID keeps its node ID and advances virtual time if its per-millisecond
  counter overflows.
- Explicit timestamp, sequence, random, node, or counter options do not mutate
  the default generator state.

Monotonicity is process-local. It does not coordinate independent machines or
isolates.

## Performance and bundle discipline

Performance is a product goal, not an excuse for surprising behavior.

- Default no-argument generation paths remain allocation-conscious and avoid
  validation work for values produced internally.
- Validation stays at public option, parsing, codec, and buffer boundaries.
- Each generator remains independently importable and tree-shakeable.
- Bundle-size changes are measured from built entry points and reviewed as part
  of the change that caused them.
- Compatibility fixes may trade a small amount of speed for correct behavior,
  but material regressions require measurements and an explicit rationale.

Shared-runner benchmarks are directional because host variance is unavoidable.
They report possible regressions instead of blocking a release by themselves.
Deterministic build, type, test, packed-package, runtime, and bundle checks are
release gates.

The compatibility benchmark runs uniku and each reference implementation in
fresh processes, with four repetitions split evenly between both launch
orders. Its result is the per-row median, and the `gh-benchmarks` baseline
retains a rolling history of action-level medians. Comparison uses each
runner's RME, robust within-action repetition dispersion, and robust
across-action baseline dispersion. Node cold starts are measured
separately from built entry points as both process-to-exit and import-plus-first
generation time; they are not mixed with warmed throughput measurements.

Collision tests distinguish independent uniform domains from stateful formats.
For an IID domain, the test compares the observed duplicate-record ratio with
the occupancy expectation for its declared output space. UUID v7, TypeID, ULID,
ObjectID, TSID, and XID instead use their documented per-isolate sequence or
counter behavior as the small-timeframe oracle. These tests do not certify the
underlying CSPRNG or provide cross-process uniqueness.

## Security posture

Random generators use `globalThis.crypto`. CUID2 uses SHA3-512 from
`@noble/hashes`; this dependency sets the Node.js minimum version.

An identifier can provide entropy or make enumeration harder, but it does not
provide authorization. Applications must not treat possession of an ID as
permission to access a resource.

Production dependency audits must report no known high or critical
vulnerabilities at release time. Published npm packages use provenance
attestations, and standalone CLI archives publish checksums.

## v1 release gates

`uniku@1.0.0` is ready only when:

1. every public entry point passes unit, integration, and packed-package smoke
   tests;
2. Node, Bun, Deno, Cloudflare Workers, and Chromium runtime checks pass;
3. generated declarations pass `publint` and Are the Types Wrong;
4. documented input-boundary and error-code contracts are covered by tests;
5. bundle summaries match the published documentation;
6. the release candidate completes its soak period without an unresolved
   correctness or publication defect;
7. the release commit and npm provenance can be traced to a green required CI
   run.

Patch releases fix compatible defects. Minor releases add compatible APIs.
Breaking changes wait for the next major version.
