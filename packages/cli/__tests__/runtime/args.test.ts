import { describe, expect, it } from '@effect/vitest'
import { preprocessArgs } from '@/src/runtime/args'

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

  it('preserves a literal -V after the end-of-options marker', () => {
    expect(preprocessArgs(['validate', '--', '-V'])).toEqual(['validate', '--', '-V'])
  })

  it('drops the end-of-options marker when no trailing operand looks like a flag', () => {
    expect(preprocessArgs(['validate', '--', 'some-id'])).toEqual(['validate', 'some-id'])
  })

  it('keeps the end-of-options marker when a trailing operand starts with a dash', () => {
    expect(preprocessArgs(['validate', '--', '--not-a-flag'])).toEqual(['validate', '--', '--not-a-flag'])
  })
})
