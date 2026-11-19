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
import { type BenchRegistration, test } from 'vitest'
import { batched } from './harness.ts'

// Internal benchmarks of uniku's own operations. Like compat.bench.ts, they
// import the built package, so run `pnpm build` first.

const runOptions = {
  time: 1000,
  iterations: 100,
  warmupTime: 500,
  warmupIterations: 50,
}

// Run each benchmark on its own. bench.compare() interleaves every task in a
// group, and a dozen interleaved tasks evict each other's warm state.
async function runInSequence(registrations: BenchRegistration<string>[]): Promise<void> {
  for (const registration of registrations) {
    await registration.run(runOptions)
  }
}

const deriveDnsV5 = uuidv5.namespace(uuidv5.DNS)
const LONG_V5_NAME = 'x'.repeat(256)

test('ID Generation', async ({ bench }) => {
  await runInSequence([
    bench(
      'uuidv4',
      batched(() => uuidv4()),
    ),
    bench(
      'uuidv5',
      batched(() => uuidv5('www.example.com', uuidv5.DNS)),
    ),
    bench(
      'uuidv5.namespace()',
      batched(() => deriveDnsV5('www.example.com')),
    ),
    bench(
      'uuidv5 (256-char name)',
      batched(() => uuidv5(LONG_V5_NAME, uuidv5.DNS)),
    ),
    bench(
      'uuidv7',
      batched(() => uuidv7()),
    ),
    bench(
      'ulid',
      batched(() => ulid()),
    ),
    bench(
      'typeid',
      batched(() => typeid('user')),
    ),
    bench(
      'cuid2',
      batched(() => cuid2()),
    ),
    bench(
      'nanoid',
      batched(() => nanoid()),
    ),
    bench(
      'nanoid(10)',
      batched(() => nanoid(10)),
    ),
    bench(
      'nanoid({ alphabet: hex })',
      batched(() => nanoid({ alphabet: '0123456789abcdef', size: 12 })),
    ),
    bench(
      'ksuid',
      batched(() => ksuid()),
    ),
    bench(
      'objectid',
      batched(() => objectid()),
    ),
    bench(
      'tsid',
      batched(() => tsid()),
    ),
    bench(
      'xid',
      batched(() => xid()),
    ),
  ])
})

test('ID toBytes', async ({ bench }) => {
  const v4String = uuidv4()
  const v5String = uuidv5('www.example.com', uuidv5.DNS)
  const v7String = uuidv7()
  const ulidString = ulid()
  const typeidString = typeid('user')
  const ksuidString = ksuid()
  const objectidString = objectid()
  const tsidId = tsid()
  const xidString = xid()

  await runInSequence([
    bench(
      'uuidv4.toBytes',
      batched(() => uuidv4.toBytes(v4String)),
    ),
    bench(
      'uuidv5.toBytes',
      batched(() => uuidv5.toBytes(v5String)),
    ),
    bench(
      'uuidv7.toBytes',
      batched(() => uuidv7.toBytes(v7String)),
    ),
    bench(
      'ulid.toBytes',
      batched(() => ulid.toBytes(ulidString)),
    ),
    bench(
      'typeid.toBytes',
      batched(() => typeid.toBytes(typeidString)),
    ),
    bench(
      'ksuid.toBytes',
      batched(() => ksuid.toBytes(ksuidString)),
    ),
    bench(
      'objectid.toBytes',
      batched(() => objectid.toBytes(objectidString)),
    ),
    bench(
      'tsid.toBytes',
      batched(() => tsid.toBytes(tsidId)),
    ),
    bench(
      'xid.toBytes',
      batched(() => xid.toBytes(xidString)),
    ),
  ])
})

test('ID fromBytes', async ({ bench }) => {
  const v4Bytes = uuidv4.toBytes(uuidv4())
  const v5Bytes = uuidv5.toBytes(uuidv5('www.example.com', uuidv5.DNS))
  const v7Bytes = uuidv7.toBytes(uuidv7())
  const ulidBytes = ulid.toBytes(ulid())
  const typeidBytes = typeid.toBytes(typeid('user'))
  const ksuidBytes = ksuid.toBytes(ksuid())
  const objectidBytes = objectid.toBytes(objectid())
  const tsidBytes = tsid.toBytes(tsid())
  const xidBytes = xid.toBytes(xid())

  await runInSequence([
    bench(
      'uuidv4.fromBytes',
      batched(() => uuidv4.fromBytes(v4Bytes)),
    ),
    bench(
      'uuidv5.fromBytes',
      batched(() => uuidv5.fromBytes(v5Bytes)),
    ),
    bench(
      'uuidv7.fromBytes',
      batched(() => uuidv7.fromBytes(v7Bytes)),
    ),
    bench(
      'ulid.fromBytes',
      batched(() => ulid.fromBytes(ulidBytes)),
    ),
    bench(
      'typeid.fromBytes',
      batched(() => typeid.fromBytes('user', typeidBytes)),
    ),
    bench(
      'ksuid.fromBytes',
      batched(() => ksuid.fromBytes(ksuidBytes)),
    ),
    bench(
      'objectid.fromBytes',
      batched(() => objectid.fromBytes(objectidBytes)),
    ),
    bench(
      'tsid.fromBytes',
      batched(() => tsid.fromBytes(tsidBytes)),
    ),
    bench(
      'xid.fromBytes',
      batched(() => xid.fromBytes(xidBytes)),
    ),
  ])
})

test('ID isValid', async ({ bench }) => {
  const v4String = uuidv4()
  const v5String = uuidv5('www.example.com', uuidv5.DNS)
  const v7String = uuidv7()
  const ulidString = ulid()
  const typeidString = typeid('user')
  const cuid2String = cuid2()
  const nanoidString = nanoid()
  const ksuidString = ksuid()
  const objectidString = objectid()
  const tsidId = tsid()
  const xidString = xid()

  await runInSequence([
    bench(
      'uuidv4.isValid',
      batched(() => uuidv4.isValid(v4String)),
    ),
    bench(
      'uuidv5.isValid',
      batched(() => uuidv5.isValid(v5String)),
    ),
    bench(
      'uuidv7.isValid',
      batched(() => uuidv7.isValid(v7String)),
    ),
    bench(
      'ulid.isValid',
      batched(() => ulid.isValid(ulidString)),
    ),
    bench(
      'typeid.isValid',
      batched(() => typeid.isValid(typeidString)),
    ),
    bench(
      'cuid2.isValid',
      batched(() => cuid2.isValid(cuid2String)),
    ),
    bench(
      'nanoid.isValid',
      batched(() => nanoid.isValid(nanoidString)),
    ),
    bench(
      'ksuid.isValid',
      batched(() => ksuid.isValid(ksuidString)),
    ),
    bench(
      'objectid.isValid',
      batched(() => objectid.isValid(objectidString)),
    ),
    bench(
      'tsid.isValid',
      batched(() => tsid.isValid(tsidId)),
    ),
    bench(
      'xid.isValid',
      batched(() => xid.isValid(xidString)),
    ),
  ])
})
