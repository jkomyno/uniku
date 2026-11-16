export const counter = (error.code === 'COUNTER_OUT_OF_RANGE' && (error.strategy === 'uuid' || error.strategy === 'typeid'))
export const timestamp = (error.code === 'TIMESTAMP_OUT_OF_RANGE' && (error.strategy === 'uuid' || error.strategy === 'typeid'))
export const random = (error.code === 'RANDOM_BYTES_TOO_SHORT' && (error.strategy === 'uuid' || error.strategy === 'typeid'))
export const typeidOnly = error.code === 'TIMESTAMP_OUT_OF_RANGE' && error.strategy === 'typeid'
export const uuidOnly = error.code === 'COUNTER_OUT_OF_RANGE' && error.strategy === 'uuid'
