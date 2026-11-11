export const first = (error.code === 'INVALID_CHAR' && error.strategy === 'ulid')
export const second = ("INVALID_CHAR" === result.error.code && result.error.strategy === "uuid")
export const third = ((error.code) === 'NON_CANONICAL' && error.strategy === 'xid')
export const existing = error.code === 'INVALID_LENGTH' && error.strategy === 'ulid'
export const mixedAnd = ready && (error.code === 'VALUE_OUT_OF_RANGE' && error.strategy === 'ksuid')
export const mixedOr = (error.code === 'INVALID_CHAR' && error.strategy === 'ksuid') || fallback
export const negated = !((error.code === 'NODE_OUT_OF_RANGE' && error.strategy === 'tsid'))
export const converging =
  (error.code === 'TIMESTAMP_OUT_OF_RANGE' && error.strategy === 'uuid') || (error.code === 'TIMESTAMP_OUT_OF_RANGE' && error.strategy === 'ulid')
export const commented = (error.code /* keep */ === 'LENGTH_OUT_OF_RANGE' && error.strategy === 'nanoid') // outside
