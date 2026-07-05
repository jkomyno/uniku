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
})
