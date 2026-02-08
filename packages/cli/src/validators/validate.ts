import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
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
    case 'ksuid':
      return validateKsuid(id)
    case 'cuid':
      return validateCuid(id)
    case 'nanoid':
      return validateNanoid(id)
  }
}

/**
 * Auto-detect ID type and validate.
 * Detection order: UUID > ULID > KSUID > CUID > Nanoid.
 */
export function validateAutoDetect(id: string): ValidationResult {
  // 1. UUID (36 chars, 8-4-4-4-12 format with hyphens)
  if (uuidv7.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 7 }
  }
  if (uuidv4.isValid(id)) {
    return { id, valid: true, type: 'uuid', version: 4 }
  }

  // 2. ULID (26 chars, Crockford Base32)
  if (ulid.isValid(id)) {
    return { id, valid: true, type: 'ulid' }
  }

  // 3. KSUID (27 chars, Base62)
  if (ksuid.isValid(id)) {
    return { id, valid: true, type: 'ksuid' }
  }

  // 4. CUID (starts with letter, Base36)
  if (cuid2.isValid(id)) {
    return { id, valid: true, type: 'cuid' }
  }

  // 5. Nanoid (fallback: URL-safe A-Za-z0-9_- and length 1-256)
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

function validateKsuid(id: string): ValidationResult {
  if (ksuid.isValid(id)) {
    return { id, valid: true, type: 'ksuid' }
  }
  return { id, valid: false, type: 'ksuid', error: 'invalid KSUID format' }
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
