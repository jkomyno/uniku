import { cuid2 } from '../build/cuid2/cuid2.mjs'
import { ksuid } from '../build/ksuid/ksuid.mjs'
import { nanoid } from '../build/nanoid/nanoid.mjs'
import { ulid } from '../build/ulid/ulid.mjs'
import { uuidv4 } from '../build/uuid/v4.mjs'
import { uuidv7 } from '../build/uuid/v7.mjs'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const generators = [
  ['uuidv4', uuidv4],
  ['uuidv7', uuidv7],
  ['ulid', ulid],
  ['cuid2', cuid2],
  ['nanoid', nanoid],
  ['ksuid', ksuid],
]

for (const [name, generator] of generators) {
  const id = generator()

  assert(typeof id === 'string' && id.length > 0, `${name} should generate a non-empty string`)
  assert(generator.isValid(id), `${name} should validate its generated ID`)
}

console.info(`Runtime smoke passed for ${generators.length} uniku entry points.`)
