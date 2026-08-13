# uniku v1 codemod

This private workspace contains the deterministic source migration from `uniku` 0.6 to v1. It is prepared for distribution through the Codemod Registry, independently from the `uniku` and `@uniku/cli` npm packages. Registry publication remains a separate acceptance gate, so this document intentionally provides no Registry invocation yet.

## Local development

From the repository root:

```sh
pnpm --filter @jkomyno/uniku-v1 typecheck
pnpm --filter @jkomyno/uniku-v1 test
pnpm --filter @jkomyno/uniku-v1 workflow:validate
```

To preview the local workflow against a consumer checkout:

```sh
cd codemods/v1
pnpm exec codemod workflow run -w . -t /absolute/path/to/consumer --dry-run
```

Remove `--dry-run` to apply the edits. The runner refuses a dirty Git worktree by default; use `--allow-dirty` only after preserving unrelated work. Review the source diff and every `uniku-v1-audit` record, run the consumer's own checks, then run the workflow again to confirm that it produces no further diff.

## Supported migrations

- Rename supported `cuid2` imports, direct re-exports, immediate dynamic imports, and references to `cuidv2` from `uniku/cuid/v2`.
- Rename `seq` to `counter` for imported UUID v7 and TypeID calls.
- Rename Nanoid object-form `size` to `length`.
- Rename `secs` to `msecs` for imported KSUID, ObjectID, and XID calls while multiplying the original expression by `1000` once.
- Rewrite direct strict positive legacy error-code comparisons to the v1 code plus the matching `strategy` condition.

The transform supports `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, and `.cts`. It uses file-scoped semantic analysis and requests no network, unrestricted filesystem, or child-process capability.

## Manual migration findings

Ambiguous constructs remain unchanged and emit deterministic `uniku-v1-audit` JSON records with a rule ID, location, reason, and migration-guide URL. They also increment the `uniku-v1-manual-migrations` report metric.

Manual review is required for unsupported CUID import shapes, static `require()`, imports behind local re-export chains, option objects with conflicting destination keys, spreads or computed keys, and option arguments that are not inline objects. Error-code cases that use loose or negative comparisons, conflicting strategy checks, optional or computed access, switch labels, lookup data, destructured values, or indirect variables are also reported without edits.

Independent supported edits in the same file may still be applied when another construct needs manual work.

## Publication

The publication gate requires `.github/workflows/publish-uniku-v1-codemod.yml`, the protected `codemod-registry` environment, and `refs/tags/uniku-v1-codemod@*`. The trusted publisher must be configured for repository `jkomyno/uniku` and package `@jkomyno/uniku-v1`. The workflow requires the tag, checked-out commit, approved source SHA, and current `origin/main` commit to agree before requesting a short-lived OIDC token.

`@uniku/cli` remains an ID operations tool and does not include source migrations.
