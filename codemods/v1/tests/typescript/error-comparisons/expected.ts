interface ErrorLike {
  code: string
  strategy?: string
}

declare const error: ErrorLike
declare const nested: { current: ErrorLike }

export const asserted = ((error as ErrorLike).code === 'PREFIX_TOO_LONG' && (error as ErrorLike).strategy === 'typeid')
export const memberChain = (nested.current.code === 'COUNTER_OUT_OF_RANGE' && nested.current.strategy === 'objectid')
export const existing = 'ALPHABET_INVALID_CHAR' === error.code && 'nanoid' === error.strategy
