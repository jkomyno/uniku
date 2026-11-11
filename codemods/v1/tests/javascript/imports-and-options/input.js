import * as uuid from 'uniku/uuid/v7'
import { typeid as makeTypeId } from 'uniku/typeid'
import { nanoid } from 'uniku/nanoid'
import { xid } from 'uniku/xid'

const seq = 4
const size = 12
const secs = 8

export const values = [
  uuid.uuidv7({ seq }),
  makeTypeId('user', { seq: 2 }),
  nanoid({ alphabet: 'abcdef', size }),
  nanoid({ 'size': 8 }),
  nanoid(12),
  xid({ secs }),
  xid({ secs: start + offset }),
  xid({ secs: condition ? start : fallback }),
  xid({ "secs": 2 }),
]
