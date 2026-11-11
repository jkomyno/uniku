export const wrongStrategy = error.code === 'ULID_INVALID_CHAR' && error.strategy === 'uuid'
export const negative = error.code !== 'UUID_INVALID_LENGTH'
export const loose = error.code == 'KSUID_INVALID_CHAR'
export const looseNegative = error.code != 'XID_INVALID_LENGTH'
export const optional = error?.code === 'TSID_INVALID_CHAR'
export const computed = error['code'] === 'TYPEID_INVALID_FORMAT'

switch (error.code) {
  case 'OBJECTID_INVALID_LENGTH':
    break
}

export const handlers = { 'NANOID_ALPHABET_DUPLICATE': handleDuplicate }
export const retryable = ['ULID_RANDOM_OVERFLOW']
const { code = 'CUID2_RANDOM_BYTES_EMPTY' } = error
export const held = 'XID_NON_CANONICAL'
export const indirect = error.code === held
const { code: destructuredCode } = error
export const destructured = destructuredCode === 'UUID_BUFFER_OUT_OF_BOUNDS'
