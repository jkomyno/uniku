import type { UniqueIdError } from 'uniku/errors'

/**
 * Structured CLI error with optional hint and exit code.
 */
export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly hint?: string,
    readonly exitCode: number = 1,
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/**
 * Error indicating validation failure (exit code 2).
 */
export class ValidationFailedError extends CliError {
  constructor(message: string) {
    super('VALIDATION_FAILED', message, undefined, 2)
    this.name = 'ValidationFailedError'
  }
}

/**
 * Maps a uniku library error into a CliError, preserving code and message.
 */
export function fromUnikuError(err: UniqueIdError): CliError {
  return new CliError(err.code, err.message)
}

/**
 * Converts a CliError to a JSON-serializable object for stderr output.
 */
export function errorToJson(err: CliError): { error: string; code: string; hint?: string } {
  const obj: { error: string; code: string; hint?: string } = {
    error: err.message,
    code: err.code,
  }
  if (err.hint) {
    obj.hint = err.hint
  }
  return obj
}
