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

  it('leaves a literal -V after the end-of-options marker alone', () => {
    expect(preprocessArgs(['validate', '--', '-V'])).toEqual(['validate', '--', '-V'])
  })

  it('keeps the end-of-options marker and its operands as given', () => {
    expect(preprocessArgs(['inspect', '--', '--not-a-flag'])).toEqual(['inspect', '--', '--not-a-flag'])
    expect(preprocessArgs(['uuid', '--', 'some-id'])).toEqual(['uuid', '--', 'some-id'])
  })

  it('leaves a root-level end-of-options marker alone', () => {
    expect(preprocessArgs(['--', 'inspect', 'some-id'])).toEqual(['--', 'inspect', 'some-id'])
  })
})
