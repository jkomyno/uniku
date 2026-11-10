import { cuid2 } from '../build/cuid2/cuid2.mjs'
import { ksuid } from '../build/ksuid/ksuid.mjs'
import { nanoid } from '../build/nanoid/nanoid.mjs'
import { objectid } from '../build/objectid/objectid.mjs'
import { tsid } from '../build/tsid/tsid.mjs'
import { typeid } from '../build/typeid/typeid.mjs'
import { ulid } from '../build/ulid/ulid.mjs'
import { uuidv4 } from '../build/uuid/v4.mjs'
import { uuidv5 } from '../build/uuid/v5.mjs'
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

// uuidv5 is name-based: it takes required inputs and is deterministic, so instead
// of a no-argument call it must reproduce fixed vectors identically on every runtime.
// RFC 9562 Appendix A.4, and a non-ASCII name hashed as UTF-8 (computed with `uuid`'s v5).
const uuidv5Vectors = [
  ['www.example.com', uuidv5.DNS, '2ed6657d-e927-568b-95e1-2665a8aea6a2'],
  ['日本語🦄', uuidv5.URL, 'd2cdb36d-613b-5f03-a81c-eaa948daae54'],
]
for (const [name, namespace, expected] of uuidv5Vectors) {
  const id = uuidv5(name, namespace)
  assert(id === expected, `uuidv5(${JSON.stringify(name)}) should be ${expected}, got ${id}`)
  assert(uuidv5.namespace(namespace)(name) === expected, `uuidv5.namespace should derive ${expected}`)
  assert(uuidv5.isValid(id), 'uuidv5 should validate its derived ID')
  assert(uuidv5.fromBytes(uuidv5.toBytes(id)) === id, 'uuidv5 should round-trip through bytes')
}

const coveredCount = generators.length + 2
console.info(`Runtime smoke passed for ${coveredCount} uniku entry points.`)
