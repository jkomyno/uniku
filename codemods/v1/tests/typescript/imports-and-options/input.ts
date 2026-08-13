import { objectid, objectid as makeObjectId } from 'uniku/objectid'
import { uuidv7, uuidv7 as makeUuid } from 'uniku/uuid/v7'

declare const raw: unknown
declare const seq: number

export const values = [
  objectid({ secs: raw as number }),
  objectid({ secs: -1 }),
  objectid({ secs: source.current }),
  objectid({ secs: (raw as number) }),
  makeObjectId({ secs: 3 }),
  uuidv7({ seq }),
  makeUuid({ seq: 4 }),
]
