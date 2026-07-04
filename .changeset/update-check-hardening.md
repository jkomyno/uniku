---
"@uniku/cli": patch
---

Harden the background update check by negative-caching failed fetches, reducing exit delay, scoping the temp cache per user, and rejecting unsafe prerelease strings.
