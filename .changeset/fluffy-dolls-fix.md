---
"uniku": patch
---

This release:
- Consolidates shared utilities into `src/common/` (bytes manipulation, random byte pooling)
- Adds `MIN`/`MAX` constants for all ID generators (uuid v4/v7, ulid, ksuid, nanoid)
- Expands test coverage with new unit tests for edge cases and constants
- Introduces `AGENTS.md` files with AI coding guidelines at repo and package level
- Consolidates and expands RFCs with implementation details and spec references
- Updates README with guidance on when to use each ID generation strategy
- Improves benchmark workflow with relative margin of error and faster execution
- Adds bundle size CI reporting with automatic PR comments
- Simplifies benchmark and bundle analysis scripts
- Updates `CONTRIBUTING.md` guide with current development workflow
