import * as uuid from 'uniku/uuid/v7'
import { typeid as makeTypeId } from 'uniku/typeid'
import { nanoid } from 'uniku/nanoid'
import { xid } from 'uniku/xid'

const seq = 4
const size = 12
const secs = 8

export const values = [
  uuid.uuidv7({ counter: seq }),
  makeTypeId('user', { counter: 2 }),
  nanoid({ alphabet: 'abcdef', length: size }),
  nanoid({ 'length': 8 }),
  nanoid(12),
  xid({ msecs: secs * 1000 }),
  xid({ msecs: (start + offset) * 1000 }),
  xid({ msecs: (condition ? start : fallback) * 1000 }),
  xid({ "msecs": 2 * 1000 }),
]
