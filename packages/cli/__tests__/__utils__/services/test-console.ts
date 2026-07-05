import * as Effect from 'effect/Effect'
import * as TestConsole from 'effect/testing/TestConsole'

const ansiPattern = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))',
  ].join('|'),
  'g',
)

const stripAnsi = (str: string) => str.replace(ansiPattern, '')

/**
 * Lines written through `Console.log` (help, version, parse errors are
 * rendered by the Effect CLI runner through the Console service).
 * Requires `TestConsole.layer` (part of `TestLive`).
 */
export const getLines = (
  params?: Partial<{
    readonly stripAnsi: boolean
  }>,
): Effect.Effect<ReadonlyArray<string>> =>
  Effect.map(TestConsole.logLines, (lines) =>
    lines.map((line) => (params?.stripAnsi ? stripAnsi(String(line)) : String(line))),
  )

/**
 * Lines written through `Console.error`.
 */
export const getErrorLines = (
  params?: Partial<{
    readonly stripAnsi: boolean
  }>,
): Effect.Effect<ReadonlyArray<string>> =>
  Effect.map(TestConsole.errorLines, (lines) =>
    lines.map((line) => (params?.stripAnsi ? stripAnsi(String(line)) : String(line))),
  )
