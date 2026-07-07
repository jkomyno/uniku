---
"@uniku/cli": minor
---

Add MongoDB ObjectID generation, validation, and inspection support to the CLI, including a `--timestamp` flag for `generate objectid` and a `uniku objectid` shorthand. Fixes auto-detection so ObjectIDs starting with a hex letter (`a`-`f`) are no longer misclassified as CUID2.
