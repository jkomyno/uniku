/**
 * Base error for all uniku errors.
 * Provides `_tag` for discriminated matching (compatible with Effect's `catchTag`)
 * and `code` for machine-readable error identification.
 */
export abstract class UniqueIdError extends Error {
  abstract readonly _tag: string
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
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
  ) {
    super(message)
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
  ) {
    super(message)
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
  ) {
    super(message)
  }
}
