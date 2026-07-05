import { describe, expect, it } from '@effect/vitest'
import { decodePreprocessedArg, preprocessArgs } from '@/src/runtime/args'

describe('preprocessArgs', () => {
  it('returns user args unchanged in the common case', () => {
    expect(preprocessArgs(['generate', 'uuid', '-n', '3'])).toEqual(['generate', 'uuid', '-n', '3'])
  })

  it('returns an empty list for a bare invocation', () => {
    expect(preprocessArgs([])).toEqual([])
  })

  it('rewrites -V to --version', () => {
    expect(preprocessArgs(['-V'])).toEqual(['--version'])
    expect(preprocessArgs(['uuid', '-V'])).toEqual(['uuid', '--version'])
  })

  it('preserves a literal -V after the end-of-options marker for ID commands', () => {
    const processed = preprocessArgs(['validate', '--', '-V'])

    expect(processed).toHaveLength(2)
    expect(processed[0]).toBe('validate')
    expect(processed[1]?.startsWith('-')).toBe(false)
    expect(decodePreprocessedArg(processed[1] ?? '')).toBe('-V')
  })

  it('routes non-dash operands after the end-of-options marker to ID commands', () => {
    const processed = preprocessArgs(['inspect', '--', 'some-id'])

    expect(processed).toHaveLength(2)
    expect(processed[0]).toBe('inspect')
    expect(decodePreprocessedArg(processed[1] ?? '')).toBe('some-id')
  })

  it('routes dash-leading operands after the end-of-options marker to ID commands', () => {
    const processed = preprocessArgs(['validate', '--', '--not-a-flag'])

    expect(processed).toHaveLength(2)
    expect(processed[0]).toBe('validate')
    expect(processed[1]?.startsWith('-')).toBe(false)
    expect(decodePreprocessedArg(processed[1] ?? '')).toBe('--not-a-flag')
  })

  it('leaves the end-of-options marker alone for commands without literal ID operands', () => {
    expect(preprocessArgs(['uuid', '--', 'some-id'])).toEqual(['uuid', '--', 'some-id'])
  })

  it('finds the ID command behind a value-taking global flag', () => {
    const processed = preprocessArgs(['--log-level', 'info', 'inspect', '--', '-x'])

    expect(processed.slice(0, 3)).toEqual(['--log-level', 'info', 'inspect'])
    expect(decodePreprocessedArg(processed[3] ?? '')).toBe('-x')
  })

  it('finds the ID command behind a global flag in assignment form', () => {
    const processed = preprocessArgs(['--log-level=info', 'validate', '--', '-x'])

    expect(processed.slice(0, 2)).toEqual(['--log-level=info', 'validate'])
    expect(decodePreprocessedArg(processed[2] ?? '')).toBe('-x')
  })

  it('leaves a root-level end-of-options marker alone', () => {
    expect(preprocessArgs(['--', 'inspect', 'some-id'])).toEqual(['--', 'inspect', 'some-id'])
  })
})
