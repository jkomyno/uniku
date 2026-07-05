import * as Schema from 'effect/Schema'
import type { UniqueIdError } from 'uniku/errors'

/**
 * Structured CLI error with optional hint. Exit code 1.
 */
export class CliError extends Schema.TaggedErrorClass<CliError>()('CliError', {
  code: Schema.String,
  message: Schema.String,
  hint: Schema.optionalKey(Schema.String),
}) {
  readonly exitCode: number = 1
}

/**
 * Error indicating validation failure (exit code 2).
 */
export class ValidationFailedError extends Schema.TaggedErrorClass<ValidationFailedError>()('ValidationFailedError', {
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
export function errorToJson(err: CliFailure): { error: string; code: string; hint?: string } {
  const obj: { error: string; code: string; hint?: string } = {
    error: err.message,
    code: err.code,
  }
  if (err.hint) {
    obj.hint = err.hint
  }
  return obj
}
