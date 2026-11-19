import { KSUID as npmKsuid } from '@owpz/ksuid'
import { createId as npmCuid2, isCuid as npmIsCuid } from '@paralleldrive/cuid2'
import { ObjectId as NpmObjectId } from 'bson'
import { nanoid as npmNanoid } from 'nanoid'
import { init as initNeXid, XID as npmNeXid } from 'nexid'
import { TSID as npmTsid } from 'tsid-ts'
import { typeid as npmTypeid, fromString as npmTypeidFromString } from 'typeid-js'
import { isValid as npmIsValidUlid, ulid as npmUlid } from 'ulid'
import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
import { objectid } from 'uniku/objectid'
import { tsid } from 'uniku/tsid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv5 } from 'uniku/uuid/v5'
import { uuidv7 } from 'uniku/uuid/v7'
import { xid } from 'uniku/xid'
import {
  v4 as npmUuidV4,
  v5 as npmUuidV5,
  v7 as npmUuidV7,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid'
import { describe, test } from 'vitest'
import { BENCH_RUN_OPTIONS, batched } from './harness.ts'

// The suite imports the built package through its `uniku/*` exports, so run
// `pnpm build` first. It measures the code that ships.

const benchmarkImplementation = process.env.UNIKU_BENCH_IMPLEMENTATION ?? 'all'
if (!['all', 'uniku', 'reference'].includes(benchmarkImplementation)) {
  throw new Error('UNIKU_BENCH_IMPLEMENTATION must be all, uniku, or reference')
}

type Task = () => unknown

/** uniku and the reference it is compared against: an npm package, or a regex where no package exists. */
type RowTasks = { readonly uniku: Task } & ({ readonly npm: Task } | { readonly regex: Task })

function isSelected(implementation: string): boolean {
  if (benchmarkImplementation === 'all') return true
  return (implementation === 'uniku') === (benchmarkImplementation === 'uniku')
}

/**
 * Register one comparison row. CI runs uniku and the reference in separate
 * processes (see scripts/bench-compat.ts), so each process times one side.
 */
function row(name: string, tasks: RowTasks): void {
  test(name, async ({ bench }) => {
    const [first, ...rest] = Object.entries(tasks)
      .filter(([implementation]) => isSelected(implementation))
      .map(([implementation, task]) => bench(implementation, batched(task)))
    await (rest.length === 0 ? first.run(BENCH_RUN_OPTIONS) : bench.compare(first, ...rest, BENCH_RUN_OPTIONS))
  })
}

const nexid = await initNeXid()
const V5_NAME = 'www.example.com'
const V5_LONG_NAME = 'x'.repeat(256)

// Pre-generate IDs for validation benchmarks
const testIds = {
  unikuV4: uuidv4(),
  unikuV5: uuidv5(V5_NAME, uuidv5.DNS),
  unikuV7: uuidv7(),
  unikuUlid: ulid(),
  unikuTypeid: typeid('user'),
  unikuNanoid: nanoid(),
  unikuCuid2: cuid2(),
  unikuKsuid: ksuid(),
  unikuObjectid: objectid(),
  unikuTsid: tsid.toString(tsid()),
  unikuXid: xid(),
  npmV4: npmUuidV4(),
  npmV5: npmUuidV5(V5_NAME, npmUuidV5.DNS),
  npmV7: npmUuidV7(),
  npmUlid: npmUlid(),
  npmTypeid: npmTypeid('user').toString(),
  npmNanoid: npmNanoid(),
  npmCuid2: npmCuid2(),
  npmKsuid: npmKsuid.random().toString(),
  npmObjectid: new NpmObjectId().toHexString(),
  npmTsid: npmTsid.create().toString(),
  npmXid: nexid.fastId(),
}

describe('Generation', () => {
  row('UUID v4', { uniku: () => uuidv4(), npm: () => npmUuidV4() })
  row('UUID v5', { uniku: () => uuidv5(V5_NAME, uuidv5.DNS), npm: () => npmUuidV5(V5_NAME, npmUuidV5.DNS) })
  row('UUID v5 (256-char name)', {
    uniku: () => uuidv5(V5_LONG_NAME, uuidv5.DNS),
    npm: () => npmUuidV5(V5_LONG_NAME, npmUuidV5.DNS),
  })
  row('UUID v7', { uniku: () => uuidv7(), npm: () => npmUuidV7() })
  row('ULID', { uniku: () => ulid(), npm: () => npmUlid() })
  row('TypeID', { uniku: () => typeid('user'), npm: () => npmTypeid('user').toString() })
  row('NanoID', { uniku: () => nanoid(), npm: () => npmNanoid() })
  row('NanoID (10)', { uniku: () => nanoid(10), npm: () => npmNanoid(10) })
  row('CUID2', { uniku: () => cuid2(), npm: () => npmCuid2() })
  // npmKsuid.random() returns a Buffer wrapper, so the string conversion is part of the work.
  row('KSUID', { uniku: () => ksuid(), npm: () => npmKsuid.random().toString() })
  row('ObjectID', { uniku: () => objectid(), npm: () => new NpmObjectId().toHexString() })
  row('TSID', { uniku: () => tsid(), npm: () => npmTsid.create() })
  row('XID', { uniku: () => xid(), npm: () => nexid.fastId() })
})

describe('Validation', () => {
  row('UUID v4', {
    uniku: () => uuidv4.isValid(testIds.npmV4),
    npm: () => uuidValidate(testIds.unikuV4) && uuidVersion(testIds.unikuV4) === 4,
  })
  row('UUID v5', {
    uniku: () => uuidv5.isValid(testIds.npmV5),
    npm: () => uuidValidate(testIds.unikuV5) && uuidVersion(testIds.unikuV5) === 5,
  })
  row('UUID v7', {
    uniku: () => uuidv7.isValid(testIds.npmV7),
    npm: () => uuidValidate(testIds.unikuV7) && uuidVersion(testIds.unikuV7) === 7,
  })
  row('ULID', { uniku: () => ulid.isValid(testIds.npmUlid), npm: () => npmIsValidUlid(testIds.unikuUlid) })
  row('TypeID', {
    uniku: () => typeid.isValid(testIds.npmTypeid),
    npm: () => npmTypeidFromString(testIds.unikuTypeid, 'user'),
  })
  // Matches uniku's rule: any length > 0 with valid chars.
  const NANOID_REGEX = /^[A-Za-z0-9_-]+$/
  row('NanoID', { uniku: () => nanoid.isValid(testIds.npmNanoid), regex: () => NANOID_REGEX.test(testIds.unikuNanoid) })
  row('CUID2', { uniku: () => cuid2.isValid(testIds.npmCuid2), npm: () => npmIsCuid(testIds.unikuCuid2) })
  // uniku checks the format with a regex. @owpz/ksuid validates by parsing (Base62
  // decode plus object creation), which is more thorough and slower.
  row('KSUID', {
    uniku: () => ksuid.isValid(testIds.npmKsuid),
    npm: () => npmKsuid.parseOrNil(testIds.unikuKsuid).isNil(),
  })
  row('ObjectID', {
    uniku: () => objectid.isValid(testIds.npmObjectid),
    npm: () => NpmObjectId.isValid(testIds.unikuObjectid),
  })
  // tsid.isValid checks a bigint range, not a string format, so validating a
  // string goes through fromString first, as the CLI's validateTsid does.
  // tsid-ts has no boolean isValid either: TSID.fromString throws on malformed input.
  row('TSID', {
    uniku: () => {
      try {
        return tsid.isValid(tsid.fromString(testIds.npmTsid))
      } catch {
        return false
      }
    },
    npm: () => {
      try {
        return npmTsid.fromString(testIds.unikuTsid)
      } catch {
        return undefined
      }
    },
  })
  // NeXID has no boolean validation helper; parsing is the equivalent.
  row('XID', {
    uniku: () => xid.isValid(testIds.npmXid),
    npm: () => {
      try {
        return npmNeXid.fromString(testIds.unikuXid)
      } catch {
        return undefined
      }
    },
  })
})
