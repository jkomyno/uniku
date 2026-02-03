import { KSUID as npmKsuid } from '@owpz/ksuid'
import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { nanoid as npmNanoid } from 'nanoid'
import { ulid as npmUlid } from 'ulid'
import { v4 as npmUuidV4, v7 as npmUuidV7, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { bench, describe } from 'vitest'
import { cuid2 } from '@/src/cuid2/cuid2'
import { ksuid } from '@/src/ksuid/ksuid'
import { nanoid } from '@/src/nanoid/nanoid'
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
  unikuNanoid: nanoid(),
  unikuCuid2: cuid2(),
  unikuKsuid: ksuid(),
  npmV4: npmUuidV4(),
  npmV7: npmUuidV7(),
  npmUlid: npmUlid(),
  npmNanoid: npmNanoid(),
  npmCuid2: npmCuid2(),
  npmKsuid: npmKsuid.random().toString(),
}

describe('Generation: UUID v4', () => {
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

describe('Generation: UUID v7', () => {
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

describe('Generation: ULID', () => {
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

describe('Generation: NanoID', () => {
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

describe('Generation: CUID2', () => {
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

describe('Validation: UUID v4', () => {
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

describe('Validation: UUID v7', () => {
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

describe('Validation: ULID', () => {
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

describe('Validation: NanoID', () => {
  // Matches uniku's actual validation: any length > 0 with valid chars
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

describe('Validation: CUID2', () => {
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

describe('Generation: KSUID', () => {
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
      npmKsuid.random()
    },
    benchOptions,
  )
})

describe('Validation: KSUID', () => {
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
