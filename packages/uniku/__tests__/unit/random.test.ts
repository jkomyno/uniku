import { afterEach } from 'vitest'
import { bytesToHex, expectDistinctRandomSamples } from '../helpers/randomness'

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

  it('generates distinct uint32 values within the expected collision threshold', async () => {
    const { randomUint32 } = await importFreshRandomModule()

    expectDistinctRandomSamples({
      count: 100_000,
      randomBits: 32,
      generate: randomUint32,
    })
  })

  it('generates distinct pooled byte chunks within the expected collision threshold', async () => {
    const { rng } = await importFreshRandomModule()

    expectDistinctRandomSamples({
      count: 10_000,
      randomBits: 128,
      generate: () => bytesToHex(rng()),
    })
  })

  it('generates distinct direct-filled byte chunks within the expected collision threshold', async () => {
    const { randomBytes } = await importFreshRandomModule()

    expectDistinctRandomSamples({
      count: 1_000,
      randomBits: 2_400,
      generate: () => bytesToHex(randomBytes(300)),
    })
  })
})
