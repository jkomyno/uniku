import { cuid2 } from '../build/cuid2/cuid2.mjs'
import { ksuid } from '../build/ksuid/ksuid.mjs'
import { nanoid } from '../build/nanoid/nanoid.mjs'
import { typeid } from '../build/typeid/typeid.mjs'
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
  ['typeid', () => typeid('user'), typeid],
  ['cuid2', cuid2],
  ['nanoid', nanoid],
  ['ksuid', ksuid],
]

for (const [name, generate, validator = generate] of generators) {
  const id = generate()

  assert(typeof id === 'string' && id.length > 0, `${name} should generate a non-empty string`)
  assert(validator.isValid(id), `${name} should validate its generated ID`)
}

console.info(`Runtime smoke passed for ${generators.length} uniku entry points.`)
