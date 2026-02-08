/** Default count for ID generation. */
export const COUNT_DEFAULT = 1

/** Valid UUID versions. */
export const UUID_VERSIONS = [4, 7] as const

/** Default UUID version. */
export const UUID_VERSION_DEFAULT = 4

/** Default nanoid size. */
export const NANOID_SIZE_DEFAULT = 21

/** Nanoid size range. */
export const NANOID_SIZE_MIN = 1
export const NANOID_SIZE_MAX = 256

/** Default CUID2 length. */
export const CUID_LENGTH_DEFAULT = 24

/** CUID2 length range. */
export const CUID_LENGTH_MIN = 2
export const CUID_LENGTH_MAX = 32

/** Nanoid alphabet presets. */
export const NANOID_ALPHABET_PRESETS: Record<string, string> = {
  hex: '0123456789abcdef',
  numeric: '0123456789',
  alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
}

/** Environment variable for default generate type. */
export const ENV_DEFAULT_TYPE = 'UNIKU_DEFAULT_TYPE'
