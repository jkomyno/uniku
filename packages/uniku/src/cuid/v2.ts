/**
 * `uniku/cuid/v2` — the canonical, versioned entry point for the CUID2 generator.
 *
 * This mirrors the versioned-subpath convention used by `uniku/uuid/v4` and
 * `uniku/uuid/v7`, and supersedes the now-`@deprecated` `uniku/cuid2` entry
 * point. It re-exports the single existing implementation under the `cuidv2`
 * name — there is no second implementation.
 *
 * @example
 * ```ts
 * import { cuidv2 } from 'uniku/cuid/v2'
 *
 * const id = cuidv2()
 * // => "pfh0haxfpzowht3oi213cqos"
 *
 * cuidv2.isValid(id) // true
 * ```
 */
export { type Cuid2 as CuidV2, type Cuid2Options as CuidV2Options, cuid2 as cuidv2 } from '../cuid2/cuid2'
