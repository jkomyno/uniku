import { bench, describe } from 'vitest'
import { ulid } from '../../src/ulid/ulid'
import { uuidv4 } from '../../src/uuid/v4'
import { uuidv7 } from '../../src/uuid/v7'

const benchOptions = {
  time: 1000,
  iterations: 100,
  warmupTime: 500,
  warmupIterations: 50,
}

// === Generation Benchmarks ===
describe('ID Generation', () => {
  bench(
    'uuidv4',
    () => {
      uuidv4()
    },
    benchOptions,
  )

  bench(
    'uuidv7',
    () => {
      uuidv7()
    },
    benchOptions,
  )

  bench(
    'ulid',
    () => {
      ulid()
    },
    benchOptions,
  )
})

// === toBytes Benchmarks ===
describe('ID toBytes', () => {
  // Pre-generate input data outside benchmark
  const v4String = uuidv4()
  const v7String = uuidv7()
  const ulidString = ulid()

  bench(
    'uuidv4.toBytes',
    () => {
      uuidv4.toBytes(v4String)
    },
    benchOptions,
  )

  bench(
    'uuidv7.toBytes',
    () => {
      uuidv7.toBytes(v7String)
    },
    benchOptions,
  )

  bench(
    'ulid.toBytes',
    () => {
      ulid.toBytes(ulidString)
    },
    benchOptions,
  )
})

// === fromBytes Benchmarks ===
describe('ID fromBytes', () => {
  // Pre-generate input data outside benchmark
  const v4Bytes = uuidv4.toBytes(uuidv4())
  const v7Bytes = uuidv7.toBytes(uuidv7())
  const ulidBytes = ulid.toBytes(ulid())

  bench(
    'uuidv4.fromBytes',
    () => {
      uuidv4.fromBytes(v4Bytes)
    },
    benchOptions,
  )

  bench(
    'uuidv7.fromBytes',
    () => {
      uuidv7.fromBytes(v7Bytes)
    },
    benchOptions,
  )

  bench(
    'ulid.fromBytes',
    () => {
      ulid.fromBytes(ulidBytes)
    },
    benchOptions,
  )
})

// === isValid Benchmarks ===
describe('ID isValid', () => {
  // Pre-generate input data outside benchmark
  const v4String = uuidv4()
  const v7String = uuidv7()
  const ulidString = ulid()

  bench(
    'uuidv4.isValid',
    () => {
      uuidv4.isValid(v4String)
    },
    benchOptions,
  )

  bench(
    'uuidv7.isValid',
    () => {
      uuidv7.isValid(v7String)
    },
    benchOptions,
  )

  bench(
    'ulid.isValid',
    () => {
      ulid.isValid(ulidString)
    },
    benchOptions,
  )
})
