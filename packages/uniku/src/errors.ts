import type { IdGenerator } from './generators'

/**
 * The canonical, ordered list of machine-readable error codes emitted by
 * uniku's public API.
 *
 * Codes describe the failure independently of an ID format. Use an error's
 * `strategy` field when the generator that raised it matters.
 */
// Plain `as const` keeps declaration emit compatible with
// `isolatedDeclarations`; every member is already a string literal.
export const ERROR_CODES = [
  'TIMESTAMP_OUT_OF_RANGE',
  'CONFLICTING_OPTIONS',
  'COUNTER_OUT_OF_RANGE',
  'NODE_OUT_OF_RANGE',
  'NODE_BITS_OUT_OF_RANGE',
  'EPOCH_INVALID',
  'PROCESS_ID_OUT_OF_RANGE',
  'MACHINE_ID_BYTES_TOO_SHORT',
  'RANDOM_BYTES_TOO_SHORT',
  'RANDOM_OVERFLOW',
  'LENGTH_OUT_OF_RANGE',
  'ALPHABET_OUT_OF_RANGE',
  'ALPHABET_INVALID_CHAR',
  'ALPHABET_DUPLICATE',
  'PREFIX_TOO_LONG',
  'PREFIX_INVALID_CHAR',
  'PREFIX_INVALID_BOUNDARY',
  'UUID_NOT_V7',
  'BYTES_INVALID_LENGTH',
  'BUFFER_OUT_OF_BOUNDS',
  'INVALID_CHAR',
  'INVALID_LENGTH',
  'INVALID_FORMAT',
  'NON_CANONICAL',
  'VALUE_OUT_OF_RANGE',
] as const

/**
 * A machine-readable error code emitted by uniku, derived from
 * {@link ERROR_CODES}.
 */
export type ErrorCode = (typeof ERROR_CODES)[number]

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
  abstract readonly code: ErrorCode

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
    readonly code: ErrorCode,
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
    readonly code: ErrorCode,
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
    readonly code: ErrorCode,
    message: string,
    options?: UniqueIdErrorOptions,
  ) {
    super(message, options)
  }
}
