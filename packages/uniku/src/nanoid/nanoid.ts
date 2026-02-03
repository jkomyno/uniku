/** Default URL-safe alphabet (64 characters): A-Z, a-z, 0-9, underscore, hyphen */
export const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

const DEFAULT_SIZE = 21
const MAX_SIZE = 2048
const NANOID_REGEX = /^[A-Za-z0-9_-]+$/

export type NanoidOptions = {
  /**
   * Random bytes for deterministic output (testing).
   * Must provide enough bytes for rejection sampling (~size * 2).
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
  /** Generate nanoid with default settings */
  (): string
  /** Generate nanoid with custom size */
  (size: number): string
  /** Generate nanoid with options */
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
    throw new Error('Alphabet must contain at least 2 characters')
  }
  if (alphabet.length > 256) {
    throw new Error('Alphabet must not exceed 256 characters')
  }
  const seen = new Set<string>()
  for (const char of alphabet) {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) {
      throw new Error('Alphabet must contain only printable ASCII characters (32-126)')
    }
    if (seen.has(char)) {
      throw new Error(`Duplicate character in alphabet: "${char}"`)
    }
    seen.add(char)
  }
}

/**
 * Validate size parameter
 */
function validateSize(size: number): void {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError('Size must be a non-negative integer')
  }
  if (size > MAX_SIZE) {
    throw new RangeError(`Size must not exceed ${MAX_SIZE}`)
  }
}

// Overloads
function nanoidFn(): string
function nanoidFn(size: number): string
function nanoidFn(options: NanoidOptions): string
function nanoidFn(sizeOrOptions?: number | NanoidOptions): string {
  let size = DEFAULT_SIZE
  let alphabet = URL_ALPHABET
  let randomBytes: Uint8Array | undefined

  if (typeof sizeOrOptions === 'number') {
    size = sizeOrOptions
  } else if (sizeOrOptions) {
    size = sizeOrOptions.size ?? DEFAULT_SIZE
    alphabet = sizeOrOptions.alphabet ?? URL_ALPHABET
    randomBytes = sizeOrOptions.random
    if (sizeOrOptions.alphabet) {
      validateAlphabet(alphabet)
    }
  }

  validateSize(size)

  if (size === 0) return ''

  // Calculate mask: smallest power-of-2 minus 1 that covers alphabet size
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1
  // Calculate step: random bytes per batch (1.6x accounts for rejection)
  const step = Math.ceil((1.6 * mask * size) / alphabet.length)

  let id = ''
  let randomOffset = 0

  while (id.length < size) {
    let bytes: Uint8Array
    if (randomBytes) {
      if (randomBytes.length - randomOffset < step) {
        throw new Error(
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
      if (index < alphabet.length) {
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
 */
export const nanoid: Nanoid = Object.assign(nanoidFn, {
  isValid,
})
