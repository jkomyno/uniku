import type { IdGenerator } from './generators'

/**
 * Extra context carried by every uniku error.
 */
export type UniqueIdErrorOptions = {
  /**
   * The ID strategy whose public boundary raised the error.
   * Error codes are strategy-agnostic (e.g. `TIMESTAMP_OUT_OF_RANGE`), so this
   * field attributes the failure to the generator that produced it.
   */
  readonly strategy?: IdGenerator
}

/**
 * Base error for all uniku errors.
 * Provides `_tag` for discriminated matching (compatible with Effect's `catchTag`),
 * `code` for machine-readable error identification, and `strategy` to attribute
 * unified codes to the ID generator that raised them.
 */
export abstract class UniqueIdError extends Error {
  abstract readonly _tag: string
  abstract readonly code: string

  /** The ID strategy whose public boundary raised the error. */
  readonly strategy?: IdGenerator

  constructor(message: string, options?: UniqueIdErrorOptions) {
    super(message)
    this.name = this.constructor.name
    this.strategy = options?.strategy
  }
}

/**
 * Thrown when generator arguments are invalid (bad size, alphabet, length, timestamp, version).
 */
export class InvalidInputError extends UniqueIdError {
  readonly _tag = 'InvalidInputError' as const

  constructor(
    readonly code: string,
    message: string,
    options?: UniqueIdErrorOptions,
  ) {
    super(message, options)
  }
}

/**
 * Thrown when parsing/decoding an ID string that has invalid format or characters.
 */
export class ParseError extends UniqueIdError {
  readonly _tag = 'ParseError' as const

  constructor(
    readonly code: string,
    message: string,
    options?: UniqueIdErrorOptions,
  ) {
    super(message, options)
  }
}

/**
 * Thrown when a byte array or buffer is too short or an offset is out of bounds.
 */
export class BufferError extends UniqueIdError {
  readonly _tag = 'BufferError' as const

  constructor(
    readonly code: string,
    message: string,
    options?: UniqueIdErrorOptions,
  ) {
    super(message, options)
  }
}
