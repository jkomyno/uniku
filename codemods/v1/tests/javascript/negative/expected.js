import { uuidv7 as makeUuid } from 'other-library'
import { nanoid } from 'uniku/nanoid'
import { xid } from 'uniku/xid'

const settings = { secs: 1, seq: 2, size: 3 }
const words = ['uniku/cuid2-example', 'secs', 'seq', 'size']

function run(nanoid, xid) {
  return [nanoid({ size: 4 }), xid({ secs: 5 })]
}

export const values = [makeUuid({ seq: 6 }), nanoid(12), settings, words, run]
