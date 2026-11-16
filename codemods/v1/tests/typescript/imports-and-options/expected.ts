import { objectid, objectid as makeObjectId } from 'uniku/objectid'
import { uuidv7, uuidv7 as makeUuid } from 'uniku/uuid/v7'

declare const raw: unknown
declare const seq: number

export const values = [
  objectid({ secs: raw as number }),
  objectid({ msecs: -1 * 1000 }),
  objectid({ secs: source.current }),
  objectid({ secs: (raw as number) }),
  makeObjectId({ msecs: 3 * 1000 }),
  uuidv7({ counter: seq }),
  makeUuid({ counter: 4 }),
]
