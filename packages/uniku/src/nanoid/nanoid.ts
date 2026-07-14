import { InvalidInputError } from '../errors'

/** Default URL-safe alphabet (64 characters): A-Z, a-z, 0-9, underscore, hyphen */
export const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

const DEFAULT_SIZE = 21
const MAX_SIZE = 2048
const NANOID_REGEX = /^[A-Za-z0-9_-]+$/

// Keep Nanoid's private pool for its default hot path. Translate random bytes
// into URL-safe ASCII once per refill, then serve IDs as sequential substrings.
const POOL_SIZE_MULTIPLIER = 128
const MAX_POOL_SIZE = 65_536
const ASCII_DECODER = new TextDecoder()
let poolBytes: Uint8Array | undefined
let characterPool = ''
let poolOffset = 0

function fillPool(bytes: number): void {
  const size = Math.min(bytes * POOL_SIZE_MULTIPLIER, MAX_POOL_SIZE)
  if (!poolBytes || poolBytes.length < size) {
    poolBytes = new Uint8Array(size)
  }
  if (poolOffset + bytes > characterPool.length) {
    crypto.getRandomValues(poolBytes)
    for (let i = 0; i < poolBytes.length; i++) {
      poolBytes[i] = URL_ALPHABET.charCodeAt(poolBytes[i] & 63)
    }
    characterPool = ASCII_DECODER.decode(poolBytes)
    poolOffset = 0
  }
}

function defaultAlphabetFromPool(size: number): string {
  fillPool(size)
  const id = characterPool.substring(poolOffset, poolOffset + size)
  poolOffset += size
  return id
}

export type NanoidOptions = {
  /**
   * Random bytes for deterministic output (testing).
   * For power-of-2 alphabets (2, 4, 8, 16, 32, 64, 128, 256): exactly `size` bytes needed.
   * For other alphabets: ~size * 2 bytes needed (rejection sampling).
   */
  random?: Uint8Array
  /**
   * Custom alphabet to use. Default: URL-safe A-Za-z0-9_-
   * Must be 2-256 printable ASCII characters (32-126) with no duplicates.
   */
  alphabet?: string
  /**
   * Length of generated ID. Default: 21. Maximum: 2048.
   */
  size?: number
}

export type Nanoid = {
  /** Generate a Nanoid with the default URL-safe alphabet and 21-character length. */
  (): string
  /** Generate a Nanoid with the default alphabet and a custom length. */
  (size: number): string
  /** Generate a Nanoid with a custom alphabet, length, or deterministic random bytes. */
  (options: NanoidOptions): string
  /**
   * Validate a nanoid string against the default URL-safe alphabet.
   * Note: Does not validate IDs generated with custom alphabets.
   */
  isValid(id: unknown): id is string
}

/**
 * Validate alphabet: 2-256 printable ASCII chars, no duplicates
 */
function validateAlphabet(alphabet: string): void {
  if (alphabet.length < 2) {
    throw new InvalidInputError('NANOID_ALPHABET_TOO_SHORT', 'Alphabet must contain at least 2 characters')
  }
  if (alphabet.length > 256) {
    throw new InvalidInputError('NANOID_ALPHABET_TOO_LONG', 'Alphabet must not exceed 256 characters')
  }
  const seen = new Set<string>()
  for (const char of alphabet) {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) {
      throw new InvalidInputError(
        'NANOID_ALPHABET_INVALID_CHAR',
        'Alphabet must contain only printable ASCII characters (32-126)',
      )
    }
    if (seen.has(char)) {
      throw new InvalidInputError('NANOID_ALPHABET_DUPLICATE', `Duplicate character in alphabet: "${char}"`)
    }
    seen.add(char)
  }
}

/**
 * Validate size parameter
 */
function validateSize(size: number): void {
  if (!Number.isInteger(size) || size < 0) {
    throw new InvalidInputError('NANOID_SIZE_INVALID', 'Size must be a non-negative integer')
  }
  if (size > MAX_SIZE) {
    throw new InvalidInputError('NANOID_SIZE_TOO_LARGE', `Size must not exceed ${MAX_SIZE}`)
  }
}

// Overloads
function nanoidFn(): string
function nanoidFn(size: number): string
function nanoidFn(options: NanoidOptions): string
function nanoidFn(sizeOrOptions?: number | NanoidOptions): string {
  // ULTRA-FAST PATH: No arguments = default nanoid
  // Uses simple pooled random bytes (npm nanoid style) for best performance
  if (sizeOrOptions === undefined) {
    return defaultAlphabetFromPool(DEFAULT_SIZE)
  }

  let size = DEFAULT_SIZE
  let alphabet = URL_ALPHABET
  let randomBytes: Uint8Array | undefined

  if (typeof sizeOrOptions === 'number') {
    size = sizeOrOptions
  } else {
    size = sizeOrOptions.size ?? DEFAULT_SIZE
    alphabet = sizeOrOptions.alphabet ?? URL_ALPHABET
    randomBytes = sizeOrOptions.random
    if (sizeOrOptions.alphabet !== undefined) {
      validateAlphabet(alphabet)
    }
  }

  validateSize(size)

  if (size === 0) return ''

  if (alphabet === URL_ALPHABET && randomBytes === undefined) {
    return defaultAlphabetFromPool(size)
  }

  const alphabetLen = alphabet.length

  // FAST PATH: Power-of-2 alphabet (includes default 64-char)
  // No rejection needed - each byte maps directly to a character
  if ((alphabetLen & (alphabetLen - 1)) === 0) {
    const mask = alphabetLen - 1
    if (randomBytes && randomBytes.length < size) {
      throw new InvalidInputError(
        'NANOID_RANDOM_BYTES_INSUFFICIENT',
        `Insufficient random bytes: need ${size}, have ${randomBytes.length}`,
      )
    }
    const bytes = randomBytes?.subarray(0, size) ?? globalThis.crypto.getRandomValues(new Uint8Array(size))
    let id = ''
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] & mask]
    }
    return id
  }

  // SLOW PATH: Rejection sampling for non-power-of-2 alphabets
  // Calculate mask: smallest power-of-2 minus 1 that covers alphabet size
  const mask = (2 << (31 - Math.clz32((alphabetLen - 1) | 1))) - 1
  // Calculate step: random bytes per batch (1.6x accounts for rejection)
  const step = Math.ceil((1.6 * mask * size) / alphabetLen)

  let id = ''
  let randomOffset = 0

  while (id.length < size) {
    let bytes: Uint8Array
    if (randomBytes) {
      if (randomBytes.length - randomOffset < step) {
        throw new InvalidInputError(
          'NANOID_RANDOM_BYTES_INSUFFICIENT',
          `Insufficient random bytes: need at least ${step} more, have ${randomBytes.length - randomOffset}`,
        )
      }
      bytes = randomBytes.subarray(randomOffset, randomOffset + step)
      randomOffset += step
    } else {
      bytes = globalThis.crypto.getRandomValues(new Uint8Array(step))
    }

    for (let i = 0; i < bytes.length && id.length < size; i++) {
      const index = bytes[i] & mask
      if (index < alphabetLen) {
        id += alphabet[index]
      }
      // Otherwise reject and continue (no modulo bias)
    }
  }

  return id
}

/**
 * Validate a nanoid string against the default URL-safe alphabet.
 * Note: Does not validate IDs generated with custom alphabets.
 */
function isValid(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && NANOID_REGEX.test(id)
}

/**
 * Generate a URL-friendly unique string ID.
 *
 * Nanoid is a tiny, secure, URL-friendly unique string ID generator.
 * It uses a URL-safe alphabet (A-Za-z0-9_-) and generates 21-character
 * IDs by default with 126 bits of entropy.
 *
 * Unlike UUID v7 or ULID, nanoid is NOT time-ordered. Use it for:
 * - URL shorteners
 * - Session tokens
 * - Invite codes
 * - Any case where you need short, random IDs
 *
 * @example Basic usage
 * ```ts
 * import { nanoid } from 'uniku/nanoid'
 *
 * const id = nanoid()
 * // => "V1StGXR8_Z5jdHi6B-myT"
 * ```
 *
 * @example Custom size
 * ```ts
 * const shortId = nanoid(10)
 * // => "IRFa-VaY2b"
 * ```
 *
 * @example Custom alphabet (hex)
 * ```ts
 * const hexId = nanoid({ alphabet: '0123456789abcdef', size: 12 })
 * // => "4f90d13a42bc"
 * ```
 *
 * @example Validation
 * ```ts
 * const maybeId: unknown = getUserInput()
 * if (nanoid.isValid(maybeId)) {
 *   // TypeScript knows maybeId is string
 *   console.log(maybeId.length)
 * }
 * ```
 *
 * @throws {InvalidInputError} Size must be between 0 and 2048
 * @throws {InvalidInputError} Alphabet must contain 2-256 unique printable ASCII characters
 * @throws {InvalidInputError} Insufficient random bytes for requested size
 */
export const nanoid: Nanoid = Object.assign(nanoidFn, {
  isValid,
})

export { InvalidInputError, UniqueIdError } from '../errors'
