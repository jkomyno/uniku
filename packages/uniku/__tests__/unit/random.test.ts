import { afterEach } from 'vitest'

async function importFreshRandomModule() {
  vi.resetModules()
  return import('@/src/common/random')
}

function mockIncrementingRandomFill() {
  let fillValue = 0
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
    if (array instanceof Uint8Array) {
      array.fill(fillValue)
      fillValue += 1
    }
    return array
  })
}

describe('random pool', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refills when exhausted', async () => {
    const getRandomValues = mockIncrementingRandomFill()
    const { randomBytes } = await importFreshRandomModule()

    expect(randomBytes(256).every((byte) => byte === 0)).toBe(true)
    expect([...randomBytes(4)]).toEqual([1, 1, 1, 1])
    expect(getRandomValues).toHaveBeenCalledTimes(2)
  })

  it('wraps and refills when a request would cross the remaining pool bytes', async () => {
    const getRandomValues = mockIncrementingRandomFill()
    const { randomBytes } = await importFreshRandomModule()

    randomBytes(254)

    expect([...randomBytes(4)]).toEqual([1, 1, 1, 1])
    expect(getRandomValues).toHaveBeenCalledTimes(2)
  })
})
