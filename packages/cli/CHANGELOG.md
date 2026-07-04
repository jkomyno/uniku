# @uniku/cli

## 0.0.13

### Patch Changes

- 3d49de0: Add the CLI bin shebang so npm global installs can execute `uniku` directly.
- 10caf59: Fix CLI error handling so invalid generator timestamps use friendly errors, JSON mode emits structured error output, and Effect CLI validation errors do not append `[object Object]`.
- 9e7c17f: Rename the UUID generator's long version flag to `--uuid-version` so `uniku uuid --version` remains the CLI version flag.
- 4ed2169: Harden CLI installers by creating missing install directories, keeping shell install POSIX-compatible, paginating release lookup, and applying chmod with sudo when needed.
- bfc9126: Correct published metadata by lowering the Node engine floor to Node 20.19 and documenting the CUID2 `@noble/hashes` runtime dependency in the READMEs.
- 9cd7fee: Harden the background update check by negative-caching failed fetches, reducing exit delay, scoping the temp cache per user, and rejecting unsafe prerelease strings.
- Updated dependencies [9a6a9b7]
- Updated dependencies [12ead93]
- Updated dependencies [bfc9126]
- Updated dependencies [816101a]
- Updated dependencies [4cb29cc]
- Updated dependencies [874718e]
- Updated dependencies [49d6a98]
  - uniku@0.0.13

## 0.0.12

### Patch Changes

- 7c75ebb: Add background update check.
- Updated dependencies [7c75ebb]
  - uniku@0.0.12

## 0.0.11

### Patch Changes

- e11e50a: Add CLI
- Updated dependencies [e11e50a]
  - uniku@0.0.11
