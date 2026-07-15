import { expect, test } from 'bun:test'
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
// Example: requestId = '_2DECPU7LD9yGaCxNoR1P'

test('uses a Nanoid as the Hono request ID', async () => {
  const response = await app.request('/')
  const body: unknown = await response.json()

  expect(body).toEqual({ requestId: expect.any(String) })

  if (!body || typeof body !== 'object' || !('requestId' in body) || typeof body.requestId !== 'string') {
    throw new Error('Hono did not return a request ID')
  }

  expect(nanoid.isValid(body.requestId)).toBe(true)
  expect(response.headers.get('X-Request-Id')).toBe(body.requestId)
})
