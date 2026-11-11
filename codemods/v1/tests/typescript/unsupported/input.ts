import { cuid2 } from './compat.js'
import { typeid } from 'uniku/typeid'

declare const options: { seq: number }
declare const spread: Record<string, unknown>

export const values = [cuid2(), typeid('user', options), typeid('post', { ...spread, seq: 2 })]
