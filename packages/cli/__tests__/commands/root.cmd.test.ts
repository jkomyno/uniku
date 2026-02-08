import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { cli, MockConsole, TestLive } from '../__utils__'

describe('CLI: uniku root', () => {
  layer(TestLive())((it) => {
    it.scoped('[Given] --help flag [Then] prints help text', () =>
      Effect.gen(function* () {
        yield* cli(['--help'])
        const lines = yield* MockConsole.getLines()
        const output = lines.join('\n')
        expect(output).toContain('uniku')
        expect(output).toContain('generate')
        expect(output).toContain('validate')
        expect(output).toContain('inspect')
      }),
    )

    it.scoped('[Given] --version flag [Then] prints version', () =>
      Effect.gen(function* () {
        yield* cli(['--version'])
        const lines = yield* MockConsole.getLines()
        const output = lines.join('\n')
        expect(output).toContain('0.0.0-test')
      }),
    )

    it.scoped('[Given] unknown subcommand [Then] returns ValidationError', () =>
      Effect.gen(function* () {
        const result = yield* cli(['nonexistent']).pipe(Effect.catchAll((e) => Effect.succeed(e)))
        expect(result).toBeDefined()
      }),
    )
  })
})
