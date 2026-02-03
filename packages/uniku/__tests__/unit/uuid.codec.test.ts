import { formatUuid, parseUuid } from '@/src/uuid/common/uuid'

describe('uuid codec', () => {
  it('parses a uuid', () => {
    const value = parseUuid('76a65416-a8ae-4eae-94ca-7dd75823a9ea')

    expect(value).toEqual(new Uint8Array([118, 166, 84, 22, 168, 174, 78, 174, 148, 202, 125, 215, 88, 35, 169, 234]))
  })

  it('round-trips bytes through format/parse', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    const encoded = formatUuid(bytes)
    const decoded = parseUuid(encoded)
    expect(decoded).toEqual(bytes)
  })

  it('rejects invalid lengths', () => {
    expect(() => parseUuid('')).toThrow()
    expect(() => parseUuid('1234')).toThrow()
  })

  it('rejects invalid separators', () => {
    expect(() => parseUuid('1234567890ab-cdef-0123-456789abcdef')).toThrow()
    expect(() => parseUuid('12345678-90ab-cdef-0123-456789abcdef-')).toThrow()
  })

  it('rejects invalid hex characters', () => {
    expect(() => parseUuid('12345678-90ab-cdef-0123-456789abcdeg')).toThrow()
  })
})
