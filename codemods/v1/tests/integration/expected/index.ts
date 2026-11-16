import { cuidv2 } from 'uniku/cuid/v2'
import type { UniqueIdError } from 'uniku/errors'
import { uuidv7 } from 'uniku/uuid/v7'

export const matchesUlidCharacterError = (error: UniqueIdError): boolean => (error.code === 'INVALID_CHAR' && error.strategy === 'ulid')

export const values = [cuidv2(), uuidv7({ counter: 4 })]
