# Agent Skill Guidance

## Purpose

This subtree contains repository-local skills that teach agents how to work in
`uniku` without overloading the root guidance file.

## Ownership

This guidance owns `.agents/skills/**`: `SKILL.md` routers, lazy reference
files, helper scripts, and agent metadata. It does not own product source,
public package docs, release docs, or local source-reference clones.

## Local Contracts

- Keep each `SKILL.md` short enough to load eagerly; move deep examples and
  long API catalogs into first-level `references/` files.
- Route version-sensitive Effect v4 advice to `repos/effect-smol` before
  changing CLI migration code. Do not rely on public docs when they drift from
  the local source reference.
- Skill guidance may describe internal agent workflow, but public docs and
  product examples must stay focused on `uniku` decisions.
- Never import from or edit `repos/**` while maintaining skills. Refer to
  cloned sources as read-only evidence.

## Work Guidance

- When updating a skill, read its `SKILL.md` and only the referenced files
  needed for the change.
- Keep trigger descriptions precise so unrelated work does not load the skill.
- If an API example appears in a skill, verify it against the relevant package
  surface, the local Effect source clone, or the skill's example checker.
- Do not duplicate root rules unless the local skill needs a stricter version
  for a concrete task.

## Verification

- Documentation-only skill changes: `pnpm lint:ci`.
- Effect skill code examples: `node .agents/skills/effect-v4/scripts/check-examples.mjs`.
- Changes that affect source guidance for public behavior also need the
  relevant package checks from the owning package guidance.

## Child Guidance Index

No child guidance files are defined below this subtree today.
