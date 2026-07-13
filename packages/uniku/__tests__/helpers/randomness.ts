type RandomSampleKey = string | number | bigint | boolean | symbol | null | undefined

interface DistinctRandomSamplesOptions<T> {
  readonly count: number
  readonly generate: () => T
  readonly randomBits?: number
  readonly maxDuplicateCount?: number
  readonly toKey?: (sample: T) => RandomSampleKey
}

export interface IidDuplicateRatioOptions<T> {
  readonly count: number
  readonly possibleValues: number
  readonly generate: () => T
  readonly standardDeviations?: number
  readonly toKey?: (sample: T) => RandomSampleKey
}

const DEFAULT_COLLISION_TAIL_PROBABILITY = 1e-9
const LARGE_LAMBDA_THRESHOLD = 100
const NORMAL_APPROXIMATION_SIGMAS = 8
const BYTE_TO_HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'))

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => BYTE_TO_HEX[byte]).join('')
}

export function expectDistinctRandomSamples<T>(options: DistinctRandomSamplesOptions<T>): void {
  const duplicateCount = countDuplicateSamples(options.count, options.generate, options.toKey ?? String)
  const maxDuplicateCount =
    options.maxDuplicateCount ?? duplicateThresholdForRandomBits(options.count, requireRandomBits(options))

  expect(
    duplicateCount,
    `duplicate random samples exceeded threshold: ${duplicateCount} > ${maxDuplicateCount}`,
  ).toBeLessThanOrEqual(maxDuplicateCount)
}

/**
 * Expected number of generated values that repeat a previously observed value
 * after retaining one representative of each value.
 */
export function expectedIidDuplicateCount(count: number, possibleValues: number): number {
  assertIidParameters(count, possibleValues)
  // Avoid cancellation in `1 - (1 - 1/N)^n` for high-entropy ID spaces.
  // In that sparse regime, duplicate records are equivalent to collision pairs
  // to the precision a double can represent.
  if (count / possibleValues < 1e-5) {
    return (count * (count - 1)) / (2 * possibleValues)
  }
  return count - possibleValues * (1 - (1 - 1 / possibleValues) ** count)
}

/**
 * Variance of the duplicate-record count for independent uniform draws.
 */
export function iidDuplicateCountVariance(count: number, possibleValues: number): number {
  assertIidParameters(count, possibleValues)
  if (possibleValues === 1) return 0
  if (count / possibleValues < 1e-5) {
    return expectedIidDuplicateCount(count, possibleValues)
  }
  const unseenOnceLog = count * Math.log1p(-1 / possibleValues)
  const unseenTwiceLog = count * Math.log1p(-2 / possibleValues)
  const unseenOnce = Math.exp(unseenOnceLog)
  const observed = -Math.expm1(unseenOnceLog)
  // `P(both observed) - P(observed)^2` simplifies to `q2 - q1^2`.
  // Compute that covariance in log space: direct subtraction loses precision
  // at the sparse/exact boundary and can incorrectly collapse variance to zero.
  const covariance = unseenOnce ** 2 * Math.expm1(unseenTwiceLog - 2 * unseenOnceLog)
  return Math.max(0, possibleValues * observed * (1 - observed) + possibleValues * (possibleValues - 1) * covariance)
}

/**
 * Checks the observed duplicate ratio against the exact occupancy model for
 * independent uniform draws. This is only valid for an explicitly IID domain.
 */
export function expectIidDuplicateRatio<T>(options: IidDuplicateRatioOptions<T>): void {
  const standardDeviations = options.standardDeviations ?? NORMAL_APPROXIMATION_SIGMAS
  if (!Number.isFinite(standardDeviations) || standardDeviations <= 0) {
    throw new Error('standardDeviations must be a finite positive number')
  }
  const duplicateCount = countDuplicateSamples(options.count, options.generate, options.toKey ?? String)
  const expected = expectedIidDuplicateCount(options.count, options.possibleValues)
  const allowance = standardDeviations * Math.sqrt(iidDuplicateCountVariance(options.count, options.possibleValues))

  expect(
    Math.abs(duplicateCount - expected),
    `duplicate ratio outside IID model: observed ${duplicateCount / options.count}, expected ${expected / options.count}`,
  ).toBeLessThanOrEqual(allowance)
}

function assertIidParameters(count: number, possibleValues: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('count must be a non-negative integer')
  }
  if (!Number.isFinite(possibleValues) || !Number.isInteger(possibleValues) || possibleValues < 1) {
    throw new Error('possibleValues must be a finite positive integer')
  }
}

function countDuplicateSamples<T>(count: number, generate: () => T, toKey: (sample: T) => RandomSampleKey): number {
  const seen = new Set<RandomSampleKey>()
  let duplicateCount = 0

  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const key = toKey(generate())

    if (seen.has(key)) {
      duplicateCount += 1
    } else {
      seen.add(key)
    }
  }

  return duplicateCount
}

function requireRandomBits<T>(options: DistinctRandomSamplesOptions<T>): number {
  if (options.randomBits === undefined) {
    throw new Error('Provide randomBits or maxDuplicateCount for distinct random sample assertions')
  }

  return options.randomBits
}

function duplicateThresholdForRandomBits(count: number, randomBits: number): number {
  if (count < 2) {
    return 0
  }

  const expectedDuplicatePairs = (count * (count - 1)) / (2 * 2 ** randomBits)

  if (expectedDuplicatePairs > LARGE_LAMBDA_THRESHOLD) {
    return Math.ceil(expectedDuplicatePairs + NORMAL_APPROXIMATION_SIGMAS * Math.sqrt(expectedDuplicatePairs))
  }

  let probabilityAtK = Math.exp(-expectedDuplicatePairs)
  let cumulativeProbability = probabilityAtK
  let duplicateThreshold = 0

  while (1 - cumulativeProbability > DEFAULT_COLLISION_TAIL_PROBABILITY) {
    duplicateThreshold += 1
    probabilityAtK *= expectedDuplicatePairs / duplicateThreshold
    cumulativeProbability += probabilityAtK
  }

  return duplicateThreshold
}
