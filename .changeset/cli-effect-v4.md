---
'@uniku/cli': minor
---

Port the CLI from Effect v3 to Effect v4 (pinned to the exact `effect@4.0.0-beta.93` prerelease; betas may break between releases, so the pin is deliberate). `@effect/cli` and `@effect/platform` are gone — the CLI framework now comes from `effect/unstable/cli` and platform services from `@effect/platform-bun@4.0.0-beta.93`.

Core behavior is preserved: `--help`, `--version`/`-V`, JSON output, stdin validation, `--quiet`, and exit codes 0/1/2 all work as before, including `uniku validate -- <id>` end-of-options usage (also for IDs that start with a dash).

New capabilities from the Effect v4 CLI engine: `-v` also prints the version at the root level, and `--completions <shell>` and `--log-level <level>` global flags are available.

Known behavior differences from the new parser:

- `--version` output is now `uniku v<version>` instead of the bare version number.
- A value-taking flag passed without a value (e.g. `uniku uuid --uuid-version`) now silently falls back to the flag's default instead of erroring.
- Negative numbers passed to numeric flags (e.g. `--count -1`) now fail with a parse error instead of being accepted silently.
