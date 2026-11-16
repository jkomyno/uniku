import { cuidv2 } from 'uniku/cuid/v2'
import { uuidv7 } from 'uniku/uuid/v7'
import { nanoid } from 'uniku/nanoid'
import { ksuid } from 'uniku/ksuid'

export const values = [cuidv2(), uuidv7({ counter: 2 }), nanoid({ length: 4 }), ksuid({ msecs: 1000 })]
export const currentErrorMatch = error.code === 'INVALID_CHAR' && error.strategy === 'ulid'
