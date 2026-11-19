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
import { type Bench, test } from 'vitest'
import { batched } from './harness.ts'

const runOptions = {
  time: 1000,
  iterations: 100,
  warmupTime: 500,
  warmupIterations: 50,
}

// Run each benchmark on its own. bench.compare() interleaves every task in a
// group, and a dozen interleaved tasks evict each other's warm state.
async function runInSequence(bench: Bench, tasks: [name: string, task: () => unknown][]): Promise<void> {
  for (const [name, task] of tasks) {
    await bench(name, batched(task)).run(runOptions)
  }
}

const deriveDnsV5 = uuidv5.namespace(uuidv5.DNS)
const LONG_V5_NAME = 'x'.repeat(256)

test('ID Generation', async ({ bench }) => {
  await runInSequence(bench, [
    ['uuidv4', () => uuidv4()],
    ['uuidv5', () => uuidv5('www.example.com', uuidv5.DNS)],
    ['uuidv5.namespace()', () => deriveDnsV5('www.example.com')],
    ['uuidv5 (256-char name)', () => uuidv5(LONG_V5_NAME, uuidv5.DNS)],
    ['uuidv7', () => uuidv7()],
    ['ulid', () => ulid()],
    ['typeid', () => typeid('user')],
    ['cuid2', () => cuid2()],
    ['nanoid', () => nanoid()],
    ['nanoid(10)', () => nanoid(10)],
    ['nanoid({ alphabet: hex })', () => nanoid({ alphabet: '0123456789abcdef', size: 12 })],
    ['ksuid', () => ksuid()],
    ['objectid', () => objectid()],
    ['tsid', () => tsid()],
    ['xid', () => xid()],
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

  await runInSequence(bench, [
    ['uuidv4.toBytes', () => uuidv4.toBytes(v4String)],
    ['uuidv5.toBytes', () => uuidv5.toBytes(v5String)],
    ['uuidv7.toBytes', () => uuidv7.toBytes(v7String)],
    ['ulid.toBytes', () => ulid.toBytes(ulidString)],
    ['typeid.toBytes', () => typeid.toBytes(typeidString)],
    ['ksuid.toBytes', () => ksuid.toBytes(ksuidString)],
    ['objectid.toBytes', () => objectid.toBytes(objectidString)],
    ['tsid.toBytes', () => tsid.toBytes(tsidId)],
    ['xid.toBytes', () => xid.toBytes(xidString)],
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

  await runInSequence(bench, [
    ['uuidv4.fromBytes', () => uuidv4.fromBytes(v4Bytes)],
    ['uuidv5.fromBytes', () => uuidv5.fromBytes(v5Bytes)],
    ['uuidv7.fromBytes', () => uuidv7.fromBytes(v7Bytes)],
    ['ulid.fromBytes', () => ulid.fromBytes(ulidBytes)],
    ['typeid.fromBytes', () => typeid.fromBytes('user', typeidBytes)],
    ['ksuid.fromBytes', () => ksuid.fromBytes(ksuidBytes)],
    ['objectid.fromBytes', () => objectid.fromBytes(objectidBytes)],
    ['tsid.fromBytes', () => tsid.fromBytes(tsidBytes)],
    ['xid.fromBytes', () => xid.fromBytes(xidBytes)],
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

  await runInSequence(bench, [
    ['uuidv4.isValid', () => uuidv4.isValid(v4String)],
    ['uuidv5.isValid', () => uuidv5.isValid(v5String)],
    ['uuidv7.isValid', () => uuidv7.isValid(v7String)],
    ['ulid.isValid', () => ulid.isValid(ulidString)],
    ['typeid.isValid', () => typeid.isValid(typeidString)],
    ['cuid2.isValid', () => cuid2.isValid(cuid2String)],
    ['nanoid.isValid', () => nanoid.isValid(nanoidString)],
    ['ksuid.isValid', () => ksuid.isValid(ksuidString)],
    ['objectid.isValid', () => objectid.isValid(objectidString)],
    ['tsid.isValid', () => tsid.isValid(tsidId)],
    ['xid.isValid', () => xid.isValid(xidString)],
  ])
})
