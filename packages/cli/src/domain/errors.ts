import * as Schema from 'effect/Schema'
import type { UniqueIdError } from 'uniku/errors'

/**
 * Structured CLI error with optional hint. Exit code 1.
 */
export class CliError extends Schema.TaggedError<CliError>()('CliError', {
  code: Schema.String,
  message: Schema.String,
  hint: Schema.optionalKey(Schema.String),
}) {
  readonly exitCode: number = 1
}

/**
 * Error indicating validation failure (exit code 2).
 */
export class ValidationFailedError extends Schema.TaggedError<ValidationFailedError>()('ValidationFailedError', {
  message: Schema.String,
}) {
  readonly code: string = 'VALIDATION_FAILED'
  readonly hint: string | undefined = undefined
  readonly exitCode: number = 2
}

/**
 * Union of all CLI-owned expected failures.
 */
export type CliFailure = CliError | ValidationFailedError

/**
 * Maps a uniku library error into a CliError, preserving code and message.
 */
export function fromUnikuError(err: UniqueIdError): CliError {
  return new CliError({ code: err.code, message: err.message })
}

/**
 * Converts a CLI failure to a JSON-serializable object for stderr output.
 */
export type CliErrorJson = {
  readonly error: string
  readonly code: string
  readonly hint?: string
}

export function errorToJson(err: CliFailure): CliErrorJson {
  return err.hint ? { error: err.message, code: err.code, hint: err.hint } : { error: err.message, code: err.code }
}
