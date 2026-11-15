---
"uniku": patch
---

Preserve TSID sequencing when configuring node, nodeBits, or epoch. Configured calls and empty options now retain the per-isolate counter, handle clock rollback, and advance virtual time on counter overflow instead of sampling counters independently. Explicit timestamps and counters continue to bypass shared state.
