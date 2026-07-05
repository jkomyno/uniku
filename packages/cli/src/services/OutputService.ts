import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { type CliFailure, errorToJson } from '@/src/domain/errors'
import type { InspectResult, ValidationResult } from '@/src/domain/types'

export type OutputOptions = {
  readonly json: boolean
}

/**
 * A command's primary output: a JSON-serializable value plus a human-readable
 * text rendering. Text is a list of records, each written on its own line
 * (a record may itself span multiple lines, e.g. inspect output).
 */
export interface Render {
  readonly json: () => unknown
  readonly text: () => ReadonlyArray<string>
}

/**
 * Renders a primary-output value to the records to write. This is the only
 * place where output-format branching exists.
 */
export function render(value: Render, options: OutputOptions): ReadonlyArray<string> {
  return options.json ? [JSON.stringify(value.json())] : value.text()
}

/**
 * Writes a command's primary output. Commands build one `Render` value and
 * emit it exactly once — stdout carries only the primary output, errors go
 * to stderr.
 */
export class OutputService extends Context.Service<
  OutputService,
  {
    readonly write: (value: Render, options: OutputOptions) => Effect.Effect<void>
    readonly writeError: (value: Render, options: OutputOptions) => Effect.Effect<void>
  }
>()('uniku/cli/OutputService') {
  /**
   * Default implementation writing to process.stdout / process.stderr.
   */
  static readonly layer = Layer.succeed(
    OutputService,
    OutputService.of({
      write: (value, options) => Effect.sync(() => writeRecords(process.stdout, render(value, options))),
      writeError: (value, options) => Effect.sync(() => writeRecords(process.stderr, render(value, options))),
    }),
  )
}

function writeRecords(sink: NodeJS.WritableStream, records: ReadonlyArray<string>): void {
  for (const record of records) {
    sink.write(`${record}\n`)
  }
}

// ── Primary-output values ───────────────────────────────────────────

export function idsOutput(ids: readonly string[]): Render {
  return {
    json: () => (ids.length === 1 ? ids[0] : ids),
    text: () => ids,
  }
}

export function validationOutput(results: readonly ValidationResult[]): Render {
  return {
    json: () => (results.length === 1 ? results[0] : results),
    text: () => results.map(formatValidationHuman),
  }
}

export function inspectOutput(result: InspectResult): Render {
  return {
    json: () => result,
    text: () => [formatInspectHuman(result)],
  }
}

export function errorOutput(error: CliFailure): Render {
  return {
    json: () => errorToJson(error),
    text: () => [formatErrorHuman(error)],
  }
}

// ── Human renderings ────────────────────────────────────────────────

function formatValidationHuman(result: ValidationResult): string {
  if (result.valid) {
    const version = result.version != null ? ` v${result.version}` : ''
    return `valid (${result.type}${version})`
  }
  return `invalid: ${result.error ?? 'malformed identifier'}`
}

function formatInspectHuman(result: InspectResult): string {
  const lines: string[] = []
  const typeLabel = result.version != null ? `${result.type} (v${result.version})` : result.type
  lines.push(`Type:      ${typeLabel}`)
  if (result.timestamp) {
    lines.push(`Timestamp: ${result.timestamp}`)
  }
  if (result.random) {
    lines.push(`Random:    ${result.random}`)
  }
  if (result.note) {
    lines.push(`Note: ${result.note}`)
  }
  return lines.join('\n')
}

function formatErrorHuman(error: CliFailure): string {
  return error.hint ? `Error: ${error.message}\n  ${error.hint}` : `Error: ${error.message}`
}
