---
"@uniku/cli": patch
---

Validate explicitly selected ID formats before inspection and report malformed IDs as structured failures on stderr, including with --json. Use the library's stateful TSID generation for configured nodes, and retain one node identity within fixed-timestamp batches.
