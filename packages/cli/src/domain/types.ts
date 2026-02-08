/**
 * Supported ID types.
 */
export type IdType = 'uuid' | 'ulid' | 'nanoid' | 'cuid' | 'ksuid'

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
  readonly random?: string
  readonly note?: string
}
