import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { nanoid as npmNanoid } from 'nanoid'
import { ulid as npmUlid } from 'ulid'
import { v4 as npmUuidV4, v7 as npmUuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { bench, describe } from 'vitest'
import { cuid2 } from '../../src/cuid2/cuid2'
import { nanoid } from '../../src/nanoid/nanoid'
import { ulid } from '../../src/ulid/ulid'
import { uuidv4 } from '../../src/uuid/v4'
import { uuidv7 } from '../../src/uuid/v7'

// ulid npm (v2.3.0) has no isValid(), use regex
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i

// Pre-generate IDs for validation benchmarks
const testIds = {
  unikuV4: uuidv4(),
  unikuV7: uuidv7(),
  unikuUlid: ulid(),
  unikuNanoid: nanoid(),
  unikuCuid2: cuid2(),
  npmV4: npmUuidV4(),
  npmV7: npmUuidV7(),
  npmUlid: npmUlid(),
  npmNanoid: npmNanoid(),
  npmCuid2: npmCuid2(),
}

describe('Generation: UUID v4', () => {
  bench('uniku', () => {
    uuidv4()
  })
  bench('npm', () => {
    npmUuidV4()
  })
})

describe('Generation: UUID v7', () => {
  bench('uniku', () => {
    uuidv7()
  })
  bench('npm', () => {
    npmUuidV7()
  })
})

describe('Generation: ULID', () => {
  bench('uniku', () => {
    ulid()
  })
  bench('npm', () => {
    npmUlid()
  })
})

describe('Generation: NanoID', () => {
  bench('uniku', () => {
    nanoid()
  })
  bench('npm', () => {
    npmNanoid()
  })
})

describe('Generation: CUID2', () => {
  bench('uniku', () => {
    cuid2()
  })
  bench('npm', () => {
    npmCuid2()
  })
})

describe('Validation: UUID v4', () => {
  bench('uniku', () => {
    uuidv4.isValid(testIds.npmV4)
  })
  bench('npm', () => {
    uuidValidate(testIds.unikuV4) && uuidVersion(testIds.unikuV4) === 4
  })
})

describe('Validation: UUID v7', () => {
  bench('uniku', () => {
    uuidv7.isValid(testIds.npmV7)
  })
  bench('npm', () => {
    uuidValidate(testIds.unikuV7) && uuidVersion(testIds.unikuV7) === 7
  })
})

describe('Validation: ULID', () => {
  bench('uniku', () => {
    ulid.isValid(testIds.npmUlid)
  })
  bench('regex', () => {
    ULID_REGEX.test(testIds.unikuUlid)
  })
})

describe('Validation: NanoID', () => {
  const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/
  bench('uniku', () => {
    nanoid.isValid(testIds.npmNanoid)
  })
  bench('regex', () => {
    NANOID_REGEX.test(testIds.unikuNanoid)
  })
})

describe('Validation: CUID2', () => {
  bench('uniku', () => {
    cuid2.isValid(testIds.npmCuid2)
  })
  bench('npm', () => {
    npmIsCuid(testIds.unikuCuid2)
  })
})
