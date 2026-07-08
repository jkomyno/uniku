import { ID_GENERATORS, type IdGenerator } from 'uniku/generators'

export { ID_GENERATORS }

/**
 * Supported ID types.
 *
 * Derived from `uniku`'s canonical `ID_GENERATORS` list — the CLI keeps the
 * `IdType` name (it carries no product meaning worth a repo-wide rename) but no
 * longer hand-maintains the union.
 */
export type IdType = IdGenerator

/**
 * Result of validating a single ID.
 */
export type ValidationResult = {
  readonly id: string
  readonly valid: boolean
  readonly type?: IdType
  readonly version?: number
  readonly error?: string
}

/**
 * Result of inspecting a single ID.
 */
export type InspectResult = {
  readonly id: string
  readonly type: IdType
  readonly version?: number
  readonly timestamp?: string
  readonly timestamp_ms?: number
  readonly prefix?: string
  readonly suffix?: string
  readonly random?: string
  readonly note?: string
}
