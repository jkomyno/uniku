import { KSUID as npmKsuid } from '@owpz/ksuid'
import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { ObjectId as NpmObjectId } from 'bson'
import { nanoid as npmNanoid } from 'nanoid'
import { TSID as npmTsid } from 'tsid-ts'
import { typeid as npmTypeid, fromString as npmTypeidFromString } from 'typeid-js'
import { ulid as npmUlid } from 'ulid'
import { v4 as npmUuidV4, v7 as npmUuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { bench, describe } from 'vitest'
import { cuid2 } from '@/src/cuid2/cuid2'
import { ksuid } from '@/src/ksuid/ksuid'
import { nanoid } from '@/src/nanoid/nanoid'
import { objectid } from '@/src/objectid/objectid'
import { tsid } from '@/src/tsid/tsid'
import { typeid } from '@/src/typeid/typeid'
import { ulid } from '@/src/ulid/ulid'
import { uuidv4 } from '@/src/uuid/v4'
import { uuidv7 } from '@/src/uuid/v7'

// Benchmark options for stable, reproducible results
// Using 500ms time budget (down from 1000ms) - still achieves <2% RME for stable benchmarks
// Removed explicit iterations to let Vitest auto-calculate optimal count
const benchOptions = {
  time: 500,
  warmupTime: 250,
  warmupIterations: 25,
}

// ulid npm (v2.3.0) has no isValid(), use regex
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

// Pre-generate IDs for validation benchmarks
const testIds = {
  unikuV4: uuidv4(),
  unikuV7: uuidv7(),
  unikuUlid: ulid(),
  unikuTypeid: typeid('user'),
  unikuNanoid: nanoid(),
  unikuCuid2: cuid2(),
  unikuKsuid: ksuid(),
  unikuObjectid: objectid(),
  unikuTsid: tsid.toString(tsid()),
  npmV4: npmUuidV4(),
  npmV7: npmUuidV7(),
  npmUlid: npmUlid(),
  npmTypeid: npmTypeid('user').toString(),
  npmNanoid: npmNanoid(),
  npmCuid2: npmCuid2(),
  npmKsuid: npmKsuid.random().toString(),
  npmObjectid: new NpmObjectId().toHexString(),
  npmTsid: npmTsid.create().toString(),
}

describe('Generation', () => {
  describe('UUID v4', () => {
    bench(
      'uniku',
      () => {
        uuidv4()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmUuidV4()
      },
      benchOptions,
    )
  })

  describe('UUID v7', () => {
    bench(
      'uniku',
      () => {
        uuidv7()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmUuidV7()
      },
      benchOptions,
    )
  })

  describe('ULID', () => {
    bench(
      'uniku',
      () => {
        ulid()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmUlid()
      },
      benchOptions,
    )
  })

  describe('TypeID', () => {
    bench(
      'uniku',
      () => {
        typeid('user')
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmTypeid('user').toString()
      },
      benchOptions,
    )
  })

  describe('NanoID', () => {
    bench(
      'uniku',
      () => {
        nanoid()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmNanoid()
      },
      benchOptions,
    )
  })

  describe('NanoID (10)', () => {
    bench(
      'uniku',
      () => {
        nanoid(10)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmNanoid(10)
      },
      benchOptions,
    )
  })

  describe('CUID2', () => {
    bench(
      'uniku',
      () => {
        cuid2()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmCuid2()
      },
      benchOptions,
    )
  })

  describe('KSUID', () => {
    bench(
      'uniku',
      () => {
        ksuid()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        /**
         * Note: npmKsuid.random() returns a Buffer wrapper, not a string by default.
         */
        npmKsuid.random().toString()
      },
      benchOptions,
    )
  })

  describe('ObjectID', () => {
    bench(
      'uniku',
      () => {
        objectid()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        new NpmObjectId().toHexString()
      },
      benchOptions,
    )
  })

  describe('TSID', () => {
    bench(
      'uniku',
      () => {
        tsid()
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmTsid.create()
      },
      benchOptions,
    )
  })
})

describe('Validation', () => {
  describe('UUID v4', () => {
    bench(
      'uniku',
      () => {
        uuidv4.isValid(testIds.npmV4)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        uuidValidate(testIds.unikuV4) && uuidVersion(testIds.unikuV4) === 4
      },
      benchOptions,
    )
  })

  describe('UUID v7', () => {
    bench(
      'uniku',
      () => {
        uuidv7.isValid(testIds.npmV7)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        uuidValidate(testIds.unikuV7) && uuidVersion(testIds.unikuV7) === 7
      },
      benchOptions,
    )
  })

  describe('ULID', () => {
    bench(
      'uniku',
      () => {
        ulid.isValid(testIds.npmUlid)
      },
      benchOptions,
    )
    bench(
      'regex',
      () => {
        ULID_REGEX.test(testIds.unikuUlid)
      },
      benchOptions,
    )
  })

  describe('TypeID', () => {
    bench(
      'uniku',
      () => {
        typeid.isValid(testIds.npmTypeid)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmTypeidFromString(testIds.unikuTypeid, 'user')
      },
      benchOptions,
    )
  })

  describe('NanoID', () => {
    // Matches uniku's actual any length > 0 with valid chars
    const NANOID_REGEX = /^[A-Za-z0-9_-]+$/
    bench(
      'uniku',
      () => {
        nanoid.isValid(testIds.npmNanoid)
      },
      benchOptions,
    )
    bench(
      'regex',
      () => {
        NANOID_REGEX.test(testIds.unikuNanoid)
      },
      benchOptions,
    )
  })

  describe('CUID2', () => {
    bench(
      'uniku',
      () => {
        cuid2.isValid(testIds.npmCuid2)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        npmIsCuid(testIds.unikuCuid2)
      },
      benchOptions,
    )
  })

  describe('KSUID', () => {
    // Note: uniku uses format validation (regex), npm uses parse-based validation.
    // This tests format checking speed - npm's approach is more thorough but slower.
    bench(
      'uniku',
      () => {
        ksuid.isValid(testIds.npmKsuid)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        // @owpz/ksuid uses parseOrNil + isNil for validation (Base62 decode + object creation)
        npmKsuid.parseOrNil(testIds.unikuKsuid).isNil()
      },
      benchOptions,
    )
  })

  describe('ObjectID', () => {
    bench(
      'uniku',
      () => {
        objectid.isValid(testIds.npmObjectid)
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        NpmObjectId.isValid(testIds.unikuObjectid)
      },
      benchOptions,
    )
  })

  describe('TSID', () => {
    // Note: tsid.isValid operates on a bigint (a near-trivial range check), not a
    // string-format check, so validating a string goes through fromString first -
    // mirroring the CLI's validateTsid pattern (fromString + try/catch instead of
    // isValid directly). tsid-ts also has no cheap boolean isValid: TSID.fromString
    // is the parse-and-discard equivalent, throwing on malformed input.
    bench(
      'uniku',
      () => {
        try {
          tsid.isValid(tsid.fromString(testIds.npmTsid))
        } catch {
          // invalid
        }
      },
      benchOptions,
    )
    bench(
      'npm',
      () => {
        try {
          npmTsid.fromString(testIds.unikuTsid)
        } catch {
          // invalid
        }
      },
      benchOptions,
    )
  })
})
