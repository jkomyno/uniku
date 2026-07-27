import { cuidv2 } from '@/src/cuid/v2'
import { cuid2 } from '@/src/cuid2/cuid2'

describe('cuid/v2', () => {
  it('re-exports the exact same implementation as uniku/cuid2', () => {
    // `uniku/cuid/v2` is a versioned alias, not a second implementation.
    expect(cuidv2).toBe(cuid2)
  })

  it('generates a valid CUID2 via the cuidv2 alias, cross-checked against cuid2.isValid', () => {
    const id = cuidv2()
    expect(cuidv2.isValid(id)).toBe(true)
    expect(cuid2.isValid(id)).toBe(true)
  })

  it('honors the same options as cuid2 (e.g. custom length)', () => {
    expect(cuidv2({ length: 10 }).length).toBe(10)
    expect(cuidv2({ length: 32 }).length).toBe(32)
  })
})
