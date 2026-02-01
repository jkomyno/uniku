import { bench, describe } from 'vitest'
import { uuidv4 } from '../../src/uuid/v4'
import { uuidv7 } from '../../src/uuid/v7'

const benchOptions = {
  time: 1000,
  iterations: 100,
  warmupTime: 500,
  warmupIterations: 50,
}

// === Generation Benchmarks ===
describe('UUID Generation', () => {
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
})

// === toBytes Benchmarks ===
describe('UUID toBytes', () => {
  // Pre-generate input data outside benchmark
  const v4String = uuidv4()
  const v7String = uuidv7()

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
})

// === fromBytes Benchmarks ===
describe('UUID fromBytes', () => {
  // Pre-generate input data outside benchmark
  const v4Bytes = uuidv4.toBytes(uuidv4())
  const v7Bytes = uuidv7.toBytes(uuidv7())

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
})
