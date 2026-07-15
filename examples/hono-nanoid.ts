import assert from 'node:assert/strict'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { nanoid } from 'uniku/nanoid'

const app = new Hono()

app.use(
  '*',
  requestId({
    generator: () => nanoid(),
  }),
)

app.get('/', (context) => context.json({ requestId: context.get('requestId') }))

const response = await app.request('/')
const body: unknown = await response.json()

assert(body && typeof body === 'object' && 'requestId' in body)
assert(typeof body.requestId === 'string')
assert(nanoid.isValid(body.requestId))
assert.equal(response.headers.get('X-Request-Id'), body.requestId)

console.log(body)
