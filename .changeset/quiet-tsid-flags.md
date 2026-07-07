---
"@uniku/cli": minor
---

Add TSID generation, validation, and inspection support to the CLI, including `--timestamp` (milliseconds), `--node`, and `--node-bits` flags for `generate tsid`, and a `uniku tsid` shorthand. Fixes auto-detection so 13-character TSID strings are not misclassified as CUID2 or Nanoid.
