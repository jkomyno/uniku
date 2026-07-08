/**
 * Types for the plain-JS entry-point manifest (`entrypoints.mjs`).
 */

export interface EntryPoint {
  /** Package `exports` subpath, e.g. `./uuid/v4`. */
  readonly subpath: string
  /** Full import specifier, e.g. `uniku/uuid/v4`. */
  readonly name: string
  /** Source file relative to the package root, e.g. `src/uuid/v4.ts`. */
  readonly src: string
  /** Built ESM output, e.g. `./build/uuid/v4.mjs`. */
  readonly mjs: string
  /** Built declaration output, e.g. `./build/uuid/v4.d.mts`. */
  readonly dts: string
  /** Whether the entry pulls in external runtime deps (e.g. `@noble/hashes`). */
  readonly hasExternal: boolean
}

export declare const ENTRYPOINTS: ReadonlyArray<EntryPoint>
