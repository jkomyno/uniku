import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
import { objectid } from 'uniku/objectid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import type { IdType, ValidationResult } from '@/src/domain/types'

/**
 * Validate a single ID against a specific type.
 */
export function validateAs(id: string, type: IdType): ValidationResult {
  switch (type) {
    case 'uuid':
      return validateUuid(id)
    case 'ulid':
      return validateUlid(id)
    case 'typeid':
      return validateTypeid(id)
    case 'ksuid':
      return validateKsuid(id)
    case 'objectid':
      return validateObjectid(id)
    case 'cuid':
      return validateCuid(id)
    case 'nanoid':
      return validateNanoid(id)
  }
}

/**
 * Auto-detect ID type and validate.
 * Detection order: UUID > TypeID > ULID > KSUID > ObjectID > CUID > Nanoid.
 *
 * ObjectID must be checked before CUID: CUID2's default validation regex
 * (`/^[a-z][0-9a-z]+$/`, default length 24) accepts any 24-character string
 * over 0-9a-z that starts with a letter. ObjectID's alphabet (0-9a-f) is a
 * strict subset of that at the same default length, so any ObjectID whose
 * first hex digit is a-f (~37.5% of generated IDs) would also satisfy
 * cuid2.isValid() if checked first.
 */
export function validateAutoDetect(id: string): ValidationResult {
  // 1. UUID (36 chars, 8-4-4-4-12 format with hyphens)
  if (uuidv7.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 7 }
  }
  if (uuidv4.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 4 }
  }

  // 2. TypeID (optional prefix + UUID v7 base32 suffix)
  if (typeid.isValid(id)) {
    return { id, valid: true, type: 'typeid', version: 7 }
  }

  // 3. ULID (26 chars, Crockford Base32)
  if (ulid.isValid(id)) {
    return { id, valid: true, type: 'ulid' }
  }

  // 4. KSUID (27 chars, Base62)
  if (ksuid.isValid(id)) {
    return { id, valid: true, type: 'ksuid' }
  }

  // 5. ObjectID (24 chars, hex) - must precede CUID2, see doc comment above
  if (objectid.isValid(id)) {
    return { id, valid: true, type: 'objectid' }
  }

  // 6. CUID (starts with letter, Base36)
  if (cuid2.isValid(id)) {
    return { id, valid: true, type: 'cuid' }
  }

  // 7. Nanoid (fallback: URL-safe A-Za-z0-9_- and length 1-256)
  if (nanoid.isValid(id)) {
    return { id, valid: true, type: 'nanoid' }
  }

  return { id, valid: false, error: 'malformed identifier' }
}

function validateUuid(id: string): ValidationResult {
  if (uuidv7.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 7 }
  }
  if (uuidv4.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 4 }
  }
  return { id, valid: false, type: 'uuid', error: 'invalid UUID format' }
}

function validateUlid(id: string): ValidationResult {
  if (ulid.isValid(id)) {
    return { id, valid: true, type: 'ulid' }
  }
  return { id, valid: false, type: 'ulid', error: 'invalid ULID format' }
}

function validateTypeid(id: string): ValidationResult {
  if (typeid.isValid(id)) {
    return { id, valid: true, type: 'typeid', version: 7 }
  }
  return { id, valid: false, type: 'typeid', error: 'invalid TypeID format' }
}

function validateKsuid(id: string): ValidationResult {
  if (ksuid.isValid(id)) {
    return { id, valid: true, type: 'ksuid' }
  }
  return { id, valid: false, type: 'ksuid', error: 'invalid KSUID format' }
}

function validateObjectid(id: string): ValidationResult {
  if (objectid.isValid(id)) {
    return { id, valid: true, type: 'objectid' }
  }
  return { id, valid: false, type: 'objectid', error: 'invalid ObjectID format' }
}

function validateCuid(id: string): ValidationResult {
  if (cuid2.isValid(id)) {
    return { id, valid: true, type: 'cuid' }
  }
  return { id, valid: false, type: 'cuid', error: 'invalid CUID format' }
}

function validateNanoid(id: string): ValidationResult {
  if (nanoid.isValid(id)) {
    return { id, valid: true, type: 'nanoid' }
  }
  return { id, valid: false, type: 'nanoid', error: 'invalid Nanoid format' }
}
