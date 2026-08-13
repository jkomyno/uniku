import { objectid, objectid as makeObjectId } from 'uniku/objectid'
import { uuidv7, uuidv7 as makeUuid } from 'uniku/uuid/v7'

declare const raw: unknown
declare const seq: number

export const values = [
  objectid({ msecs: (raw as number) * 1000 }),
  objectid({ msecs: -1 * 1000 }),
  objectid({ msecs: source.current * 1000 }),
  objectid({ msecs: (raw as number) * 1000 }),
  makeObjectId({ msecs: 3 * 1000 }),
  uuidv7({ counter: seq }),
  makeUuid({ counter: 4 }),
]
