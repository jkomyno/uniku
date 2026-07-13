import { afterEach } from 'vitest'
import { cuid2 } from '@/src/cuid2/cuid2'
import { ksuid } from '@/src/ksuid/ksuid'
import { nanoid } from '@/src/nanoid/nanoid'
import { objectid } from '@/src/objectid/objectid'
import { tsid } from '@/src/tsid/tsid'
import { typeid } from '@/src/typeid/typeid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'
import { xid } from '@/src/xid/xid'
import {
  expectDistinctRandomSamples,
  expectedIidDuplicateCount,
  expectIidDuplicateRatio,
  iidDuplicateCountVariance,
} from '../helpers/randomness'

describe('small-timeframe collision contract', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the exact IID occupancy expectation for duplicate records', () => {
    expect(expectedIidDuplicateCount(2, 2)).toBeCloseTo(0.5)
    expect(expectedIidDuplicateCount(4, 4)).toBeCloseTo(1.265625)
    expect(iidDuplicateCountVariance(2, 2)).toBeCloseTo(0.25)
    expect(iidDuplicateCountVariance(4, 4)).toBeCloseTo(0.413818359375)
    expect(iidDuplicateCountVariance(10_000, 1_000_000_000)).toBeGreaterThan(0)
    expect(iidDuplicateCountVariance(10, 1)).toBe(0)
    expectIidDuplicateRatio({ count: 10, possibleValues: 1, generate: () => 'only' })
  })

  it('keeps every default generator unique under a frozen wall clock', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const count = 5_000
    const generators: Array<() => string> = [
      () => uuidv4(),
      () => uuidv7(),
      () => ulid(),
      () => typeid('benchmark'),
      () => cuid2(),
      () => nanoid(),
      () => ksuid(),
      () => objectid(),
      () => tsid().toString(),
      () => xid(),
    ]

    for (const generate of generators) {
      expectDistinctRandomSamples({ count, maxDuplicateCount: 0, generate })
    }
  })

  it('keeps IID collision assertions separate from stateful time-bucket assertions', () => {
    expectIidDuplicateRatio({ count: 5_000, possibleValues: 2 ** 122, generate: uuidv4 })
    expectIidDuplicateRatio({ count: 5_000, possibleValues: 64 ** 21, generate: nanoid })
    expectIidDuplicateRatio({ count: 5_000, possibleValues: 2 ** 128, generate: () => ksuid({ secs: 1_700_000_000 }) })
  })
})
