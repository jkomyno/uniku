import { ENTRYPOINTS } from './entrypoints.mjs'

const INVOKE = {
  'uuid/v4': (module) => module.uuidv4(),
  'uuid/v7': (module) => module.uuidv7(),
  ulid: (module) => module.ulid(),
  typeid: (module) => module.typeid('benchmark'),
  cuid2: (module) => module.cuid2(),
  'cuid/v2': (module) => module.cuidv2(),
  nanoid: (module) => module.nanoid(),
  ksuid: (module) => module.ksuid(),
  objectid: (module) => module.objectid(),
  tsid: (module) => module.tsid(),
  xid: (module) => module.xid(),
}

const EXCLUDED_ENTRYPOINTS = new Set(['errors', 'generators'])
const entrypoints = ENTRYPOINTS.map((entry) => ({ ...entry, entrypoint: entry.subpath.slice(2) }))
const unconfiguredEntrypoints = entrypoints.filter(
  ({ entrypoint }) => !EXCLUDED_ENTRYPOINTS.has(entrypoint) && !(entrypoint in INVOKE),
)

if (unconfiguredEntrypoints.length > 0) {
  throw new Error(
    `Cold-start benchmark needs an invocation for: ${unconfiguredEntrypoints.map(({ entrypoint }) => entrypoint).join(', ')}`,
  )
}

/**
 * Generator entry points measured by the cold-start benchmark.
 *
 * Build locations come from the package's public-entry-point manifest, so
 * renaming an entry cannot silently leave this benchmark importing a stale path.
 */
export const COLD_START_ENTRYPOINTS = entrypoints.flatMap((entry) => {
  const { entrypoint } = entry
  const invoke = INVOKE[entrypoint]
  return invoke ? [{ ...entry, entrypoint, invoke }] : []
})
