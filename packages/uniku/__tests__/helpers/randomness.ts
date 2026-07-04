type RandomSampleKey = string | number | bigint | boolean | symbol | null | undefined

interface DistinctRandomSamplesOptions<T> {
  readonly count: number
  readonly generate: () => T
  readonly randomBits?: number
  readonly maxDuplicateCount?: number
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
