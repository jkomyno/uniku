export const first = error.code === 'ULID_INVALID_CHAR'
export const second = "UUID_INVALID_HEX_CHAR" === result.error.code
export const third = (error.code) === 'XID_NON_CANONICAL'
export const existing = error.code === 'ULID_INVALID_LENGTH' && error.strategy === 'ulid'
export const mixedAnd = ready && error.code === 'KSUID_OVERFLOW'
export const mixedOr = error.code === 'KSUID_INVALID_CHAR' || fallback
export const negated = !(error.code === 'TSID_NODE_OUT_OF_RANGE')
export const converging =
  error.code === 'UUID_TIMESTAMP_OUT_OF_RANGE' || error.code === 'ULID_TIMESTAMP_OUT_OF_RANGE'
export const commented = error.code /* keep */ === 'NANOID_SIZE_INVALID' // outside
