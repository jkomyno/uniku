import { KSUID as npmKsuid } from '@owpz/ksuid'
import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { nanoid as npmNanoid } from 'nanoid'
import { ulid as npmUlid } from 'ulid'
import { v4 as npmUuidV4, v7 as npmUuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { cuid2 } from '@/src/cuid2/cuid2'
import { ksuid } from '@/src/ksuid/ksuid'
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

describe('Cross-Validation: CUID2', () => {
  it('uniku IDs pass npm validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => cuid2())
    const invalid = ids.filter((id) => !npmIsCuid(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmCuid2())
    const invalid = ids.filter((id) => !cuid2.isValid(id))
    expect(invalid).toHaveLength(0)
  })
})

describe('Cross-Validation: KSUID', () => {
  // KSUID epoch constant (May 13, 2014)
  const KSUID_EPOCH = 1400000000

  // @owpz/ksuid uses parseOrNil() which returns a nil KSUID on invalid input
  const npmKsuidIsValid = (id: string): boolean => {
    const parsed = npmKsuid.parseOrNil(id)
    // Check if it's not the nil KSUID (unless the input actually is the nil string)
    return !parsed.isNil() || id === '000000000000000000000000000'
  }

  it('uniku IDs are parseable by npm', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => ksuid())
    const invalid = ids.filter((id) => !npmKsuidIsValid(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmKsuid.random().toString())
    const invalid = ids.filter((id) => !ksuid.isValid(id))
    expect(invalid).toHaveLength(0)
  })

  it('uniku IDs round-trip through npm', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => ksuid())
    for (const id of ids) {
      const parsed = npmKsuid.parse(id)
      expect(parsed.toString()).toBe(id)
    }
  })

  it('npm IDs round-trip through uniku', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmKsuid.random().toString())
    for (const id of ids) {
      const bytes = ksuid.toBytes(id)
      const recovered = ksuid.fromBytes(bytes)
      expect(recovered).toBe(id)
    }
  })

  it('timestamp extraction matches between implementations', () => {
    // Use a fixed timestamp for reproducibility (in seconds)
    const secs = Math.floor(Date.now() / 1000)
    const unikuId = ksuid({ secs })
    const unikuTimestamp = ksuid.timestamp(unikuId)

    const parsed = npmKsuid.parse(unikuId)
    // npm returns seconds since KSUID epoch, convert to Unix ms
    const npmTimestamp = (parsed.timestamp + KSUID_EPOCH) * 1000

    // Both should be exactly equal since we're using exact second
    expect(unikuTimestamp).toBe(npmTimestamp)
  })
})
