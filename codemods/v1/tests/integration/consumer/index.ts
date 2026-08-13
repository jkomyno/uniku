import { cuid2 } from 'uniku/cuid2'
import { uuidv7 } from 'uniku/uuid/v7'

const shared = { stable: true }

export const values = [cuid2(), uuidv7({ seq: 4 }), uuidv7({ ...shared, seq: 5 })]
