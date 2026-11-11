---
"@uniku/cli": minor
---

Run on stable Effect 4.1.3 instead of the `4.0.0-beta.93` pin, which removes the direct `@effect/platform-node-shared` pin that worked around the `npm i -g` startup crash.

Command-line parsing is stricter. Each of these used to be ignored and now fails with exit code 1 and the command's help:

- a single-value flag passed twice, such as `uniku uuid -n 2 -n 3`;
- an extra positional argument, such as `uniku uuid extra`;
- a flag with a missing value, such as `uniku uuid -v`.

An invalid `--log-level` value now also shows the command's help with the error.

Negative numbers are read as flag values, so `uniku tsid --node -1` reports an invalid node instead of an unknown `-1` flag, and a negative `--count` is rejected as an invalid value. `--completions` also accepts `powershell` and `pwsh`, and parse errors are worded more plainly.
