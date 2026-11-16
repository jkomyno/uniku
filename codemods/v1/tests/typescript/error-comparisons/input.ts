interface ErrorLike {
  code: string
  strategy?: string
}

declare const error: ErrorLike
declare const nested: { current: ErrorLike }

export const asserted = (error as ErrorLike).code === 'TYPEID_PREFIX_TOO_LONG'
export const memberChain = nested.current.code === 'OBJECTID_COUNTER_OUT_OF_RANGE'
export const existing = 'NANOID_ALPHABET_INVALID_CHAR' === error.code && 'nanoid' === error.strategy
