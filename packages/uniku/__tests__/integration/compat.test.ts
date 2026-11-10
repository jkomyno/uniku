import { KSUID as npmKsuid } from '@owpz/ksuid'
import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { ObjectId as npmObjectId } from 'bson'
import { nanoid as npmNanoid } from 'nanoid'
import { init as initNeXid, XID as npmNeXid } from 'nexid'
import { TSID as npmTsid } from 'tsid-ts'
import { TypeID as NpmTypeID, fromUUID as npmTypeidFromUuid } from 'typeid-js'
import { ulid as npmUlid } from 'ulid'
import {
  v4 as npmUuidV4,
  v5 as npmUuidV5,
  v7 as npmUuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid'
import { beforeAll } from 'vitest'
import { Xid as npmXid } from 'xid-ts'
import { cuid2 } from '@/src/cuid2/cuid2'
import { ksuid } from '@/src/ksuid/ksuid'
import { nanoid } from '@/src/nanoid/nanoid'
import { objectid } from '@/src/objectid/objectid'
import { tsid } from '@/src/tsid/tsid'
import { typeid } from '@/src/typeid/typeid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv5 } from '@/src/uuid/v5'
import { uuidv7 } from '@/src/uuid/v7'
import { xid } from '@/src/xid/xid'

const BATCH_SIZE = 100

// npm uuid requires validate() + version() for version-specific validation
const npmIsValidUuidV4 = (id: string): boolean => uuidValidate(id) && uuidVersion(id) === 4
const npmIsValidUuidV5 = (id: string): boolean => uuidValidate(id) && uuidVersion(id) === 5
const npmIsValidUuidV7 = (id: string): boolean => uuidValidate(id) && uuidVersion(id) === 7

const randomInt = (max: number): number => Math.floor(Math.random() * max)

// Well-formed Unicode only: npm uuid encodes through encodeURIComponent, which throws on lone surrogates.
function randomUnicodeName(): string {
  const codePoints = Array.from({ length: randomInt(120) }, () => {
    const roll = randomInt(4)
    if (roll === 0) return 0x20 + randomInt(0x5f) // printable ASCII
    if (roll === 1) return 0x80 + randomInt(0x780) // 2-byte UTF-8
    if (roll === 2) return 0xe000 + randomInt(0x2000) // 3-byte UTF-8, past the surrogates
    return 0x10000 + randomInt(0x10000) // 4-byte UTF-8 (surrogate pairs)
  })
  return String.fromCodePoint(...codePoints)
}

// ulid npm (v2.3.0) has no isValid(), use regex for Crockford Base32 validation
// First char 0-7 to prevent overflow, rest is Crockford alphabet (excludes I, L, O, U)
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

// nanoid npm has no isValid(), use regex for default 21-char URL alphabet
const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/

let nexid: Awaited<ReturnType<typeof initNeXid>>

beforeAll(async () => {
  nexid = await initNeXid()
})

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

describe('Cross-Validation: UUID v5', () => {
  it('derives the same IDs as npm uuid for random string names and namespaces', () => {
    for (let i = 0; i < BATCH_SIZE; i += 1) {
      const namespace = npmUuidV4()
      const name = randomUnicodeName()
      expect(uuidv5(name, namespace), JSON.stringify(name)).toBe(npmUuidV5(name, namespace))
    }
  })

  it('derives the same IDs as npm uuid for random byte names and namespaces', () => {
    for (let i = 0; i < BATCH_SIZE; i += 1) {
      const namespace = crypto.getRandomValues(new Uint8Array(16))
      const name = crypto.getRandomValues(new Uint8Array(randomInt(300)))
      expect(uuidv5(name, namespace)).toBe(npmUuidV5(name, namespace))
    }
  })

  it('matches npm uuid for the RFC namespaces and buffer output', () => {
    for (const namespace of [uuidv5.DNS, uuidv5.URL, uuidv5.OID, uuidv5.X500]) {
      expect(uuidv5('www.example.com', namespace)).toBe(npmUuidV5('www.example.com', namespace))
      expect(uuidv5('www.example.com', namespace, new Uint8Array(20), 2)).toEqual(
        npmUuidV5('www.example.com', namespace, new Uint8Array(20), 2),
      )
    }
  })

  it('uniku and npm IDs pass both validators', () => {
    const ids = Array.from({ length: BATCH_SIZE }, (_, i) => uuidv5(`name-${i}`, uuidv5.URL))
    expect(ids.filter((id) => !npmIsValidUuidV5(id))).toHaveLength(0)
    const npmIds = Array.from({ length: BATCH_SIZE }, (_, i) => npmUuidV5(`name-${i}`, npmUuidV5.URL))
    expect(npmIds.filter((id) => !uuidv5.isValid(id))).toHaveLength(0)
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

describe('Cross-Validation: TypeID', () => {
  it('encodes UUID v4, v5, and v7 like typeid-js', () => {
    for (let i = 0; i < BATCH_SIZE; i += 1) {
      for (const uuid of [npmUuidV4(), npmUuidV5(randomUnicodeName(), npmUuidV4()), npmUuidV7()]) {
        const id = typeid.fromUuid('sess', uuid)
        expect(id, uuid).toBe(npmTypeidFromUuid(uuid, 'sess').toString())
        expect(NpmTypeID.fromString(id).toUUID()).toBe(uuid)
      }
    }
  })

  it('decodes typeid-js IDs', () => {
    for (let i = 0; i < BATCH_SIZE; i += 1) {
      const uuid = npmUuidV5(`name-${i}`, npmUuidV5.URL)
      expect(typeid.toUuid(npmTypeidFromUuid(uuid, 'sess').toString())).toBe(uuid)
    }
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
    // Use a fixed timestamp for reproducibility (whole seconds in milliseconds)
    const msecs = Math.floor(Date.now() / 1000) * 1000
    const unikuId = ksuid({ msecs })
    const unikuTimestamp = ksuid.timestamp(unikuId)

    const parsed = npmKsuid.parse(unikuId)
    // npm returns seconds since KSUID epoch, convert to Unix ms
    const npmTimestamp = (parsed.timestamp + KSUID_EPOCH) * 1000

    // Both should be exactly equal since we're using exact second
    expect(unikuTimestamp).toBe(npmTimestamp)
  })
})

describe('Cross-Validation: ObjectID', () => {
  it('uniku IDs are parseable by npm', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => objectid())
    const invalid = ids.filter((id) => !npmObjectId.isValid(id))
    expect(invalid).toHaveLength(0)
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => new npmObjectId().toHexString())
    const invalid = ids.filter((id) => !objectid.isValid(id))
    expect(invalid).toHaveLength(0)
  })

  it('uniku IDs round-trip through npm', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => objectid())
    for (const id of ids) {
      expect(new npmObjectId(id).toHexString()).toBe(id)
    }
  })

  it('npm IDs round-trip through uniku', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => new npmObjectId().toHexString())
    for (const id of ids) {
      const bytes = objectid.toBytes(id)
      expect(objectid.fromBytes(bytes)).toBe(id)
    }
  })

  it('timestamp extraction matches between implementations', () => {
    // Use a fixed timestamp for reproducibility (whole seconds in milliseconds)
    const msecs = Math.floor(Date.now() / 1000) * 1000
    const unikuId = objectid({ msecs })
    const unikuTimestamp = objectid.timestamp(unikuId)

    const npmTimestamp = new npmObjectId(unikuId).getTimestamp().getTime()

    // Both should be exactly equal since we're using exact second
    expect(unikuTimestamp).toBe(npmTimestamp)
  })
})

describe('Cross-Validation: TSID', () => {
  it('uniku IDs are parseable by npm', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => tsid())
    for (const id of ids) {
      const str = tsid.toString(id)
      const parsed = npmTsid.fromString(str)
      expect(parsed.toBigInt()).toBe(id)
    }
  })

  it('npm IDs pass uniku validation', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => npmTsid.create())
    for (const npmId of ids) {
      const str = npmId.toString()
      const id = tsid.fromString(str)
      expect(id).toBe(npmId.toBigInt())
    }
  })

  it('byte layout matches between implementations', () => {
    const ids = Array.from({ length: BATCH_SIZE }, () => tsid())
    for (const id of ids) {
      const unikuBytes = Array.from(tsid.toBytes(id))
      const npmBytes = Array.from(npmTsid.fromString(tsid.toString(id)).toBytes())
      expect(unikuBytes).toEqual(npmBytes)
    }
  })

  it('timestamp extraction matches between implementations', () => {
    // Use a fixed timestamp for reproducibility (in milliseconds)
    const msecs = Date.now()
    const unikuId = tsid({ msecs })
    const unikuTimestamp = tsid.timestamp(unikuId)

    const npmTimestamp = npmTsid.fromString(tsid.toString(unikuId)).timestamp

    // Both should be exactly equal since both share the same default epoch
    expect(unikuTimestamp).toBe(msecs)
    expect(unikuTimestamp).toBe(npmTimestamp)
  })
})

describe('Cross-Validation: XID', () => {
  it('uniku IDs round-trip through xid-ts and nexid', () => {
    for (const id of Array.from({ length: BATCH_SIZE }, () => xid())) {
      const fromXidTs = npmXid.parse(id)
      const fromNexid = npmNeXid.fromString(id)
      const timestamp = xid.timestamp(id)
      const bytes = xid.toBytes(id)

      expect(fromXidTs.timestamp() * 1000).toBe(timestamp)
      expect(fromNexid.time.getTime()).toBe(timestamp)
      expect(fromXidTs.toBytes()).toEqual(bytes)
      expect(fromNexid.bytes).toEqual(bytes)
    }
  })

  it('xid-ts and nexid IDs round-trip through uniku', () => {
    const ids = [
      ...Array.from({ length: BATCH_SIZE }, () => new npmXid().toString()),
      ...Array.from({ length: BATCH_SIZE }, () => String(nexid.newId())),
    ]

    for (const id of ids) {
      expect(xid.isValid(id)).toBe(true)
      expect(xid.fromBytes(xid.toBytes(id))).toBe(id)
    }
  })

  it.each([
    'c6e52g2mrqcjl44hf179',
    '9M4E2MR0UI3E8A215N4G',
  ])('rejects invalid XID %s across all implementations', (id) => {
    expect(xid.isValid(id)).toBe(false)
    expect(() => xid.toBytes(id)).toThrow()
    expect(() => npmXid.parse(id)).toThrow()
    expect(() => npmNeXid.fromString(id)).toThrow()
  })
})
