declare const error: { code?: string; strategy?: string }

export const optional = error?.code === 'TYPEID_UUID_NOT_V7'
export const computed = error['code'] === 'TSID_EPOCH_INVALID'
export const negative = error.code !== 'OBJECTID_BYTES_TOO_SHORT'
