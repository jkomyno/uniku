import { uuidv7 } from 'uniku/uuid/v7'

const shared = { stable: true }

export const value = uuidv7({ ...shared, seq: 5 })
export const legacyCodes = ['XID_NON_CANONICAL']
