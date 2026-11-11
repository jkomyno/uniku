import { cuidv2 } from 'uniku/cuid/v2'
import { ParseError } from 'uniku/errors'
import { uuidv7 } from 'uniku/uuid/v7'
import legacy from './legacy.cjs'

const error = new ParseError('INVALID_CHAR', 'invalid ULID', { strategy: 'ulid' })
if (!((error.code === 'INVALID_CHAR' && error.strategy === 'ulid'))) throw new Error('legacy error comparison did not match')

const values = [cuidv2(), uuidv7({ counter: 7 }), await legacy.create()]
if (values.some((value) => typeof value !== 'string' || value.length === 0)) {
  throw new Error('migrated generators did not return IDs')
}
