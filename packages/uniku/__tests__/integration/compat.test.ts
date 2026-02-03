import { nanoid as npmNanoid } from 'nanoid'
import { ulid as npmUlid } from 'ulid'
import { v4 as npmUuidV4, v7 as npmUuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { nanoid } from '@/src/nanoid/nanoid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'

const BATCH_SIZE = 100

// npm uuid requires validate() + version() for version-specific validation
const npmIsValidUuidV4 = (id: string): boolean => uuidValidate(id) && uuidVersion(id) === 4
const npmIsValidUuidV7 = (id: string): boolean => uuidValidate(id) && uuidVersion(id) === 7

// ulid npm (v2.3.0) has no isValid(), use regex for Crockford Base32 validation
// First char 0-7 to prevent overflow, rest is Crockford alphabet (excludes I, L, O, U)
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

// nanoid npm has no isValid(), use regex for default 21-char URL alphabet
const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/

describe('Cross-Validation: UUID v4', () => {
  it('uniku IDs pass npm validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => uuidv4())
    const invalid = ids.filter((id) => !npmIsValidUuidV4(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmUuidV4())
    const invalid = ids.filter((id) => !uuidv4.isValid(id))
    expect(invalid).toHaveLength(0)
  })
})

describe('Cross-Validation: UUID v7', () => {
  it('uniku IDs pass npm validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => uuidv7())
    const invalid = ids.filter((id) => !npmIsValidUuidV7(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmUuidV7())
    const invalid = ids.filter((id) => !uuidv7.isValid(id))
    expect(invalid).toHaveLength(0)
  })
})

describe('Cross-Validation: ULID', () => {
  it('uniku IDs pass regex validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => ulid())
    const invalid = ids.filter((id) => !ULID_REGEX.test(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmUlid())
    const invalid = ids.filter((id) => !ulid.isValid(id))
    expect(invalid).toHaveLength(0)
  })
})

describe('Cross-Validation: NanoID', () => {
  it('uniku IDs pass regex validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => nanoid())
    const invalid = ids.filter((id) => !NANOID_REGEX.test(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmNanoid())
    const invalid = ids.filter((id) => !nanoid.isValid(id))
    expect(invalid).toHaveLength(0)
  })
})
