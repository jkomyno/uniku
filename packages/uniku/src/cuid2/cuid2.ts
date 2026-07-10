import { sha3_512 } from '@noble/hashes/sha3.js'
import { randomUint32 } from '../common/random'
import { InvalidInputError } from '../errors'

export type Cuid2Options = {
  /**
   * Length of the generated ID (2-32 characters).
   * Default: 24
   */
  length?: number
  /**
   * Custom random bytes for deterministic testing.
   * Must be at least 1 byte. For adequate entropy, use at least 16 bytes.
   * Note: The fingerprint always uses cryptographically secure random bytes,
   * regardless of this option.
   */
  random?: Uint8Array
}

export type Cuid2 = {
  (options?: Cuid2Options): string
  isValid(id: unknown): id is string
}

const DEFAULT_LENGTH = 24
const MAX_LENGTH = 32
const MIN_LENGTH = 2

// Maximum initial counter value from cuid2 spec - provides ~29 bits of
// initial entropy to prevent cross-process collisions at startup
const INITIAL_COUNT_MAX = 476782367

// Validation regex: first char must be a-z, rest can be a-z or 0-9
const CUID2_REGEX = /^[a-z][0-9a-z]+$/

// Base36 alphabet
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const LETTER_ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

// Reusable TextEncoder instance (stateless, safe to share)
const textEncoder = new TextEncoder()

/**
 * Module-level state for counter and fingerprint.
 * Counter is initialized lazily on first call to prevent unnecessary crypto operations.
 * Fingerprint is also generated lazily on first call.
 */
const state: { counter: number | undefined; fingerprint: string | undefined } = {
  counter: undefined,
  fingerprint: undefined,
}

/**
 * Initialize counter using crypto for consistency with other entropy sources.
 */
function initializeCounter(): number {
  return randomUint32() % (INITIAL_COUNT_MAX + 1)
}

// --- Base36 utilities ---

function bufToBigInt(buf: Uint8Array): bigint {
  let value = 0n
  for (const byte of buf) {
    value = value * 256n + BigInt(byte)
  }
  return value
}

function bigIntToBase36(value: bigint): string {
  if (value === 0n) return '0'
  const chars: string[] = []
  while (value > 0n) {
    chars.push(ALPHABET[Number(value % 36n)])
    value = value / 36n
  }
  return chars.reverse().join('')
}

function randomLetter(random: () => number): string {
  return LETTER_ALPHABET[Math.floor(random() * 26)]
}

function createEntropy(length: number, random: () => number): string {
  const chars = new Array<string>(length)
  for (let i = 0; i < length; i++) {
    chars[i] = ALPHABET[Math.floor(random() * 36)]
  }
  return chars.join('')
}

// --- SHA3 hash wrapper ---

function hash(input: string): Uint8Array {
  return sha3_512(textEncoder.encode(input))
}

// --- Fingerprint generation ---

const BIG_LENGTH = 32

function createFingerprint(): string {
  // Always use CSPRNG for fingerprint to ensure security regardless of custom random option
  const random = getCryptoRandom
  const globals = Object.keys(globalThis).toString()
  const sourceString = globals + createEntropy(BIG_LENGTH, random)
  const hashed = hash(sourceString)
  return bigIntToBase36(bufToBigInt(hashed)).slice(1, BIG_LENGTH + 1)
}

// --- Random function factory ---

/**
 * Get a random number in [0, 1) using CUID2's own random pool.
 */
function getCryptoRandom(): number {
  return randomUint32() / 0x100000000
}

function getRandomFn(random?: Uint8Array): () => number {
  if (random) {
    if (random.length === 0) {
      throw new InvalidInputError('CUID2_RANDOM_BYTES_EMPTY', 'Random byte array cannot be empty')
    }
    let index = 0
    return () => {
      const value = random[index % random.length] / 256
      index += 1
      return value
    }
  }
  return getCryptoRandom
}

// --- Main generator ---

function cuid2Fn(options?: Cuid2Options): string {
  const requestedLength = options?.length

  if (
    requestedLength !== undefined &&
    (!Number.isInteger(requestedLength) || requestedLength < MIN_LENGTH || requestedLength > MAX_LENGTH)
  ) {
    throw new InvalidInputError(
      'CUID2_LENGTH_OUT_OF_RANGE',
      `CUID2 length must be between ${MIN_LENGTH} and ${MAX_LENGTH}. Received: ${requestedLength}`,
    )
  }
  const length = requestedLength ?? DEFAULT_LENGTH

  const random = getRandomFn(options?.random)

  // Initialize counter lazily on first call
  if (state.counter === undefined) {
    state.counter = initializeCounter()
  }

  // Initialize fingerprint lazily on first call (always uses CSPRNG)
  if (state.fingerprint === undefined) {
    state.fingerprint = createFingerprint()
  }

  const firstLetter = randomLetter(random)
  const time = Date.now().toString(36)
  state.counter += 1
  const count = state.counter.toString(36)
  const salt = createEntropy(length, random)

  const hashInput = time + salt + count + state.fingerprint
  const hashed = hash(hashInput)
  const base36Hash = bigIntToBase36(bufToBigInt(hashed))

  // Drop first char of hash to avoid histogram bias, prepend random letter
  return firstLetter + base36Hash.slice(1, length)
}

// --- Validation (type guard) ---

function isValid(id: unknown): id is string {
  return typeof id === 'string' && id.length >= MIN_LENGTH && id.length <= MAX_LENGTH && CUID2_REGEX.test(id)
}

/**
 * Generate a CUID2 string.
 *
 * CUID2 is a secure, collision-resistant identifier that hashes multiple
 * entropy sources using SHA3-512. Unlike time-ordered IDs (ULID, UUID v7),
 * CUID2 prevents enumeration attacks by making IDs non-predictable.
 *
 * Note: CUID2 does not provide toBytes/fromBytes because it is a string-native
 * format with no canonical binary representation (unlike UUID's 16-byte format).
 *
 * @example
 * ```ts
 * import { cuid2 } from 'uniku/cuid2'
 *
 * const id = cuid2()
 * // => "pfh0haxfpzowht3oi213cqos"
 *
 * // Custom length
 * const shortId = cuid2({ length: 10 })
 * // => "tz4a98xxat"
 *
 * // Validation (type guard)
 * const maybeId: unknown = getUserInput()
 * if (cuid2.isValid(maybeId)) {
 *   console.log(maybeId.length) // TypeScript knows maybeId is string
 * }
 * ```
 *
 * @deprecated Use `cuidv2` from `uniku/cuid/v2` instead. This entry point keeps
 * working unchanged, but `uniku/cuid/v2` is the canonical versioned subpath
 * (mirroring `uniku/uuid/v4` / `uniku/uuid/v7`).
 */
export const cuid2: Cuid2 = Object.assign(cuid2Fn, {
  isValid,
})

export { InvalidInputError, UniqueIdError } from '../errors'
