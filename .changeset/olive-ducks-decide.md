---
'uniku': minor
'@uniku/cli': minor
---

**Added:** unified `msecs` timestamp option for `uniku/ksuid`, `uniku/objectid`, and `uniku/xid`. Every time-ordered generator now takes milliseconds since the Unix epoch, matching `uuid/v7`, `ulid`, `tsid`, `typeid`, and the value returned by every `.timestamp()` reader. Second-precision formats truncate sub-second precision (`Math.floor(msecs / 1000)`), so the maximum expressible timestamp gains `+999ms` of headroom.

**Deprecated:** the `secs` option in those three generators. It keeps working unchanged until v1-rc, but passing both `msecs` and `secs` now throws `CONFLICTING_OPTIONS`. Migrate by multiplying existing values by 1000:

```ts
// Before
ksuid({ secs: 1_500_000_000 })
// After
ksuid({ msecs: 1_500_000_000_000 })
```

**Changed (`@uniku/cli`):** `--timestamp` for `ksuid`, `objectid`, and `xid` now expects milliseconds, consistent with `ulid` and `tsid` (`uniku ksuid --timestamp 1720000000000`). This is a behavioral break for CLI invocations that passed seconds.
