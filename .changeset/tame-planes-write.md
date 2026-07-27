---
'uniku': minor
---

**Added:** `typeid` buffer-writing overload, completing the overload shape every other byte-backed generator already supports:

```ts
const buf = new Uint8Array(32)
typeid('user', { msecs }, buf, 8) // writes the 16 canonical UUID v7 bytes at offset 8
```

Buffer-mode calls validate the prefix and all options, and bounds failures report `BUFFER_OUT_OF_BOUNDS` with `strategy: 'typeid'`.
