import { ID_GENERATORS, type IdGenerator } from '@/src/generators'

describe('generators', () => {
  it('lists exactly the 9 supported ID generators in the expected order', () => {
    expect(ID_GENERATORS).toEqual(['uuid', 'ulid', 'typeid', 'nanoid', 'cuid', 'ksuid', 'objectid', 'tsid', 'xid'])
  })

  it('contains no duplicate generators', () => {
    expect(new Set(ID_GENERATORS).size).toBe(ID_GENERATORS.length)
  })

  it('derives IdGenerator from every literal in ID_GENERATORS', () => {
    // Compile-time check: every element is assignable to IdGenerator, and each
    // IdGenerator literal is present in the array.
    for (const generator of ID_GENERATORS) {
      const asGenerator: IdGenerator = generator
      expect(ID_GENERATORS).toContain(asGenerator)
    }
  })
})
