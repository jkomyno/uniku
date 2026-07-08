/**
 * Single source of truth for uniku's public entry points.
 *
 * Consumed by `tsdown.config.ts` (build `entry` + `attw.entrypoints`),
 * `bundle-summary.ts` (`ENTRYPOINTS`), and `publish-smoke.mjs`
 * (`expectedExports`). Adding or removing an entry here propagates to all three,
 * so an entry point can no longer be registered in some consumers but not others.
 *
 * Kept as plain JS (no TypeScript syntax) so it resolves identically under
 * node, bun, and deno without depending on any runtime's TypeScript handling.
 * Types are declared in the sibling `entrypoints.d.mts`.
 */

/** @type {ReadonlyArray<{ subpath: string, src: string, hasExternal?: boolean }>} */
const ENTRIES = [
  { subpath: './uuid/v4', src: 'src/uuid/v4.ts' },
  { subpath: './uuid/v7', src: 'src/uuid/v7.ts' },
  { subpath: './ulid', src: 'src/ulid/ulid.ts' },
  { subpath: './typeid', src: 'src/typeid/typeid.ts' },
  { subpath: './cuid2', src: 'src/cuid2/cuid2.ts', hasExternal: true },
  { subpath: './cuid/v2', src: 'src/cuid/v2.ts', hasExternal: true },
  { subpath: './nanoid', src: 'src/nanoid/nanoid.ts' },
  { subpath: './ksuid', src: 'src/ksuid/ksuid.ts' },
  { subpath: './objectid', src: 'src/objectid/objectid.ts' },
  { subpath: './tsid', src: 'src/tsid/tsid.ts' },
  { subpath: './errors', src: 'src/errors.ts' },
  { subpath: './generators', src: 'src/generators.ts' },
]

/**
 * Maps a source path (`src/uuid/v4.ts`) to its built base (`uuid/v4`).
 * @param {string} src
 * @returns {string}
 */
const buildBaseOf = (src) => src.replace(/^src\//, '').replace(/\.ts$/, '')

export const ENTRYPOINTS = ENTRIES.map(({ subpath, src, hasExternal = false }) => {
  const buildBase = buildBaseOf(src)
  return {
    subpath,
    name: `uniku${subpath.slice(1)}`,
    src,
    mjs: `./build/${buildBase}.mjs`,
    dts: `./build/${buildBase}.d.mts`,
    hasExternal,
  }
})
