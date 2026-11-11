---
"@uniku/cli": patch
---

Add `uniku uuid -v 5 --namespace <dns|url|oid|x500|uuid> --name <value>` for name-based UUIDs. `uniku inspect` and `uniku validate` now recognize UUID v5 IDs, which were misdetected as Nanoid, and report the UUID version a TypeID wraps instead of assuming v7. Fix the startup crash after `npm i -g @uniku/cli` (`ERR_MODULE_NOT_FOUND` for `effect/dist/process/ChildProcess.js`) by pinning `@effect/platform-node-shared` to the same Effect beta as the rest of the CLI.
