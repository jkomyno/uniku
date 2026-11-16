import { cuid2 } from 'uniku/cuid2'
import type { UniqueIdError } from 'uniku/errors'
import { uuidv7 } from 'uniku/uuid/v7'

export const matchesUlidCharacterError = (error: UniqueIdError): boolean => error.code === 'ULID_INVALID_CHAR'

export const values = [cuid2(), uuidv7({ seq: 4 })]
