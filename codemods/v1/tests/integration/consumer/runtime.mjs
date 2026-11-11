import { cuid2 } from 'uniku/cuid2'
import { ParseError } from 'uniku/errors'
import { uuidv7 } from 'uniku/uuid/v7'
import legacy from './legacy.cjs'

const error = new ParseError('INVALID_CHAR', 'invalid ULID', { strategy: 'ulid' })
if (!(error.code === 'ULID_INVALID_CHAR')) throw new Error('legacy error comparison did not match')

const values = [cuid2(), uuidv7({ seq: 7 }), await legacy.create()]
if (values.some((value) => typeof value !== 'string' || value.length === 0)) {
  throw new Error('migrated generators did not return IDs')
}
