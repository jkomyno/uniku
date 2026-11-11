# Bumping the Effect pin

A release-to-release upgrade procedure, adapted from the 4.0 beta → 4.1.3 move.

## 1. Check the release age

pnpm 11 refuses to resolve a release younger than its `minimumReleaseAge` (one day by
default) unless it is listed in `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`.
Check the publish time with `npm view effect@<version> time.<version>`. For a release
inside the window, `pnpm install` adds exact-version exclusions for `effect`,
`@effect/platform-bun`, `@effect/platform-node-shared`, and `@effect/vitest`; keep them
exact, never a whole package family, and remove them once the release is old enough.

## 2. Bump every pin together

Every Effect package moves to the same exact version in the same change:

- `packages/cli/package.json`: `effect`, `@effect/platform-bun` (dependencies) and
  `@effect/vitest` (devDependency). `@effect/platform-node-shared` comes through
  `@effect/platform-bun`, which pins it exactly; do not add it back as a direct dependency.
- `packages/uniku/package.json` devDependencies: `effect`, `@effect/platform-bun`
  (`scripts/browser-smoke.ts`).
- `examples/package.json`: `effect` (the docs example), and the version named in
  `apps/docs/content/docs/guides/integrations.mdx`.
- `.agents/skills/effect-v4/versions.json`.

Grep for `"effect":` and `"@effect/` across `**/package.json` before assuming that list is
complete. Check the new `@effect/vitest` peer range against the workspace Vitest major.

## 3. Advance the source oracle

`repos/effect` is a submodule of `Effect-TS/effect`. Check out the tag that matches the
npm version, and commit the new submodule SHA with the bump:

```bash
git -C repos/effect fetch --tags
git -C repos/effect checkout effect@<version>
git add repos/effect
```

The submodule SHA and the npm pin are independent facts. Moving one never authorizes
moving the other.

## 4. Install and verify

```bash
pnpm install
pnpm --filter @uniku/cli typecheck
pnpm --filter @uniku/cli test
pnpm --filter @uniku/cli build
pnpm --filter uniku typecheck
pnpm --filter uniku smoke:runtime:browser
pnpm examples:check
node .agents/skills/effect-v4/scripts/check-examples.mjs
```

A green typecheck is not enough: help text, parse errors, and exit codes can change while
types stay valid. Build the CLI on the old and new versions and compare
`node packages/cli/build/bin.mjs <args>; echo $?` for help, version, each command, a bad
flag, a bad flag value, `--` operands, and `--json` errors. Also pack and install it the way
CI's "Smoke test npm global CLI install" step does, and build the standalone binary with
`pnpm --filter @uniku/cli build:binary`.

## Stop conditions

Pause and report instead of working around the release when:

- the needed behavior exists only on unreleased upstream `main`;
- `@effect/platform-bun` or `@effect/vitest` has no release matching the new `effect`;
- the new `@effect/vitest` needs a Vitest major the workspace cannot move to;
- CLI help, parsing, output, or exit codes change in a way a like-for-like adaptation
  cannot preserve.
