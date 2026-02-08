// Adapted from https://github.com/Effect-TS/effect/blob/8e2286271a982b1cc34c78fca8b9f59de71fc790/packages/cli/test/services/MockConsole.ts

import * as Array from 'effect/Array'
import * as Console from 'effect/Console'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Ref from 'effect/Ref'

// =============================================================================
// Models
// =============================================================================

export interface MockConsole extends Console.Console {
  readonly getLines: (
    params?: Partial<{
      readonly stripAnsi: boolean
    }>,
  ) => Effect.Effect<ReadonlyArray<string>>
}

// =============================================================================
// Context
// =============================================================================

export const MockConsole = Context.GenericTag<Console.Console, MockConsole>('effect/Console')

// =============================================================================
// Utilities
// =============================================================================

const ansiPattern = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))',
  ].join('|'),
  'g',
)

const stripAnsi = (str: string) => str.replace(ansiPattern, '')

// =============================================================================
// Constructors
// =============================================================================

export const make = Effect.gen(function* () {
  const lines = yield* Ref.make(Array.empty<string>())

  const getLines: MockConsole['getLines'] = (params = {}) =>
    Ref.get(lines).pipe(Effect.map((lines) => (params.stripAnsi || false ? Array.map(lines, stripAnsi) : lines)))

  const log: MockConsole['log'] = (...args) => {
    return Ref.update(lines, Array.appendAll(args))
  }

  return MockConsole.of({
    [Console.TypeId]: Console.TypeId,
    getLines,
    log,
    unsafe: globalThis.console,
    assert: () => Effect.void,
    clear: Effect.void,
    count: () => Effect.void,
    countReset: () => Effect.void,
    debug: () => Effect.void,
    dir: () => Effect.void,
    dirxml: () => Effect.void,
    error: () => Effect.void,
    group: () => Effect.void,
    groupEnd: Effect.void,
    info: () => Effect.void,
    table: () => Effect.void,
    time: () => Effect.void,
    timeEnd: () => Effect.void,
    timeLog: () => Effect.void,
    trace: () => Effect.void,
    warn: () => Effect.void,
  })
})

// =============================================================================
// Layer
// =============================================================================

export const effect = Effect.gen(function* () {
  yield* Effect.addFinalizer(() => Console.clear)
  return yield* make
})

export const layer = Layer.scoped(MockConsole, effect)

// =============================================================================
// Accessors
// =============================================================================

export const getLines = (
  params?: Partial<{
    readonly stripAnsi?: boolean
  }>,
): Effect.Effect<ReadonlyArray<string>> => Effect.consoleWith((_console) => (_console as MockConsole).getLines(params))
