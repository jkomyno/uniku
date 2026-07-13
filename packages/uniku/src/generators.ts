/**
 * The canonical, ordered list of ID generators supported by uniku.
 *
 * This is the single source of truth for the set of supported ID generators.
 * Tools that need to enumerate or validate ID generators (for example,
 * `@uniku/cli`'s `--type` flag) should derive from this array rather than
 * hand-copying the union.
 */
// Plain `as const` (not `as const satisfies readonly string[]`): the `satisfies`
// wrapper defeats isolatedDeclarations' trivial declaration emit for this export.
// All members are string literals, so the shape guard adds nothing here anyway.
export const ID_GENERATORS = ['uuid', 'ulid', 'typeid', 'nanoid', 'cuid', 'ksuid', 'objectid', 'tsid', 'xid'] as const

/**
 * The union of ID generators supported by uniku, derived from {@link ID_GENERATORS}.
 */
export type IdGenerator = (typeof ID_GENERATORS)[number]
