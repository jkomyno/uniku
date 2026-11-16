import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENTRYPOINTS } from '../../scripts/entrypoints.mjs'

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../../../..')
const ROOT_README = 'README.md'
const PACKAGE_README = 'packages/uniku/README.md'

/**
 * The README's import block documents the callable generators only. `errors` and
 * `generators` are metadata entry points documented in their own table.
 */
const UNLISTED_SUBPATHS = new Set(['./errors', './generators'])

const DOCUMENTED_GENERATORS = ENTRYPOINTS.filter(({ subpath }) => !UNLISTED_SUBPATHS.has(subpath)).map(
  ({ name }) => name,
)

function readRepositoryFile(relativePath: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8')
}

/**
 * Extract the `uniku/*` specifiers from the "There are no barrel exports" block.
 * The block exists to show every generator import, so a missing line is a claim
 * that the generator does not exist.
 */
function barrelExportImports(document: string): string[] {
  const marker = 'There are no barrel exports:'
  const markerIndex = document.indexOf(marker)
  expect(markerIndex, `"${marker}" heading is missing`).toBeGreaterThanOrEqual(0)

  const block = document.slice(markerIndex).match(/```ts\n([\s\S]*?)```/)
  expect(block, 'no fenced ts block after the "no barrel exports" heading').not.toBeNull()

  return [...block![1].matchAll(/from '([^']+)'/g)].map((match) => match[1])
}

describe('README generator imports', () => {
  it('lists every public generator entry point exactly once', () => {
    const listed = barrelExportImports(readRepositoryFile(ROOT_README))

    expect(listed).toHaveLength(new Set(listed).size)
    expect([...listed].sort()).toEqual([...DOCUMENTED_GENERATORS].sort())
  })

  it('keeps the package README identical to the root README', () => {
    // `packages/uniku/README.md` is the copy npm publishes (it is in `files`), and
    // nothing generates it from the root README, so the two drift by hand.
    expect(readRepositoryFile(PACKAGE_README)).toBe(readRepositoryFile(ROOT_README))
  })

  it('only names specifiers that resolve to a registered entry point', () => {
    const registered = new Set(ENTRYPOINTS.map(({ name }) => name))

    for (const specifier of barrelExportImports(readRepositoryFile(ROOT_README))) {
      expect(registered.has(specifier), `${specifier} is not in scripts/entrypoints.mjs`).toBe(true)
    }
  })
})
