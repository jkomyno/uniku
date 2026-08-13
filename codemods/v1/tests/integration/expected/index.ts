import { cuidv2 } from 'uniku/cuid/v2'
import { uuidv7 } from 'uniku/uuid/v7'

const shared = { stable: true }

export const values = [cuidv2(), uuidv7({ counter: 4 }), uuidv7({ ...shared, seq: 5 })]
