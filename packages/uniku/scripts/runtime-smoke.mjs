import { cuid2 } from '../build/cuid2/cuid2.mjs'
import { ksuid } from '../build/ksuid/ksuid.mjs'
import { nanoid } from '../build/nanoid/nanoid.mjs'
import { objectid } from '../build/objectid/objectid.mjs'
import { tsid } from '../build/tsid/tsid.mjs'
import { typeid } from '../build/typeid/typeid.mjs'
import { ulid } from '../build/ulid/ulid.mjs'
import { uuidv4 } from '../build/uuid/v4.mjs'
import { uuidv7 } from '../build/uuid/v7.mjs'
import { xid } from '../build/xid/xid.mjs'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// String-primary generators: generate a string and validate it directly.
const generators = [
  ['uuidv4', uuidv4],
  ['uuidv7', uuidv7],
  ['ulid', ulid],
  ['typeid', () => typeid('user'), typeid],
  ['cuid2', cuid2],
  ['nanoid', nanoid],
  ['ksuid', ksuid],
  ['objectid', objectid],
  ['xid', xid],
]

for (const [name, generate, validator = generate] of generators) {
  const id = generate()

  assert(typeof id === 'string' && id.length > 0, `${name} should generate a non-empty string`)
  assert(validator.isValid(id), `${name} should validate its generated ID`)
}

// tsid is bigint-primary: unlike every other generator, its `isValid` accepts a
// bigint (not a string) and `toString()` is the boundary conversion to a string,
// so it cannot flow through the string-first loop above.
const tsidId = tsid()
assert(typeof tsidId === 'bigint', 'tsid should generate a bigint')
assert(tsid.isValid(tsidId), 'tsid should validate its generated bigint')
const tsidStr = tsid.toString(tsidId)
assert(typeof tsidStr === 'string' && tsidStr.length > 0, 'tsid.toString should produce a non-empty string')

const coveredCount = generators.length + 1
console.info(`Runtime smoke passed for ${coveredCount} uniku entry points.`)
