---
"uniku": minor
---

Add `uniku/tsid`, a Snowflake-style 64-bit Time-Sorted Unique Identifier generator: a 42-bit millisecond timestamp, a configurable node ID (default 10 bits), and a per-millisecond counter, packed into a `bigint` — this library's first non-string primary type, reflecting TSID's value proposition as a native numeric ID (e.g. a database `BIGINT` primary key). Includes `toBytes`/`fromBytes`/`toString`/`fromString`/`timestamp`/`isValid` support and cross-validation against the `tsid-ts` npm package.
