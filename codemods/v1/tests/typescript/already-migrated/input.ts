import { cuidv2 } from 'uniku/cuid/v2'
import { typeid } from 'uniku/typeid'
import { objectid } from 'uniku/objectid'

export const values = [cuidv2(), typeid('user', { counter: 2 }), objectid({ msecs: 2_000 })]
