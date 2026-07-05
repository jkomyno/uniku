---
'@uniku/cli': patch
---

Every command's `--help` output now ends with an EXAMPLES section showing concrete invocations, geared toward machine consumers as much as humans: pairing `--json` with `-n` to get a JSON array of IDs, piping IDs through `validate --stdin --json`, exit-code-only checks with `--quiet`, and inspecting dash-leading IDs via `--`.
