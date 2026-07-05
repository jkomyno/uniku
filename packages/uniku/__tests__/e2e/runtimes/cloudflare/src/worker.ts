/**
 * E2E test worker for uniku ID generators on Cloudflare Workers.
 * Each endpoint executes ID generation/conversion inside the Workers runtime
 * and returns results as JSON for test assertions.
 */
import { Hono } from 'hono'
import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid, URL_ALPHABET } from 'uniku/nanoid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'

const app = new Hono()

/**
 * Root route - lists all available test endpoints
 */
app.get('/', (c) => {
  return c.json({
    message: 'uniku E2E Test Worker',
    generators: ['uuid-v4', 'uuid-v7', 'typeid', 'ulid', 'ksuid', 'cuid2', 'nanoid'],
  })
})

// ============================================================================
// UUID v4 Endpoints
// ============================================================================

app.get('/uuid-v4/generate', (c) => {
  try {
    const id = uuidv4()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v4/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => uuidv4())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v4/to-bytes', (c) => {
  try {
    const id = uuidv4()
    const bytes = uuidv4.toBytes(id)
    const restored = uuidv4.fromBytes(bytes)
    return c.json({
      success: true,
      original: id,
      bytes: Array.from(bytes),
      restored,
      roundTripMatch: id.toLowerCase() === restored,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v4/validate', (c) => {
  try {
    const validId = uuidv4()
    return c.json({
      success: true,
      validId,
      isValidGenerated: uuidv4.isValid(validId),
      isValidKnownGood: uuidv4.isValid('f47ac10b-58cc-4372-a567-0e02b2c3d479'),
      isValidInvalid: uuidv4.isValid('not-a-uuid'),
      isValidEmpty: uuidv4.isValid(''),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// UUID v7 Endpoints
// ============================================================================

app.get('/uuid-v7/generate', (c) => {
  try {
    const id = uuidv7()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v7/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => uuidv7())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v7/to-bytes', (c) => {
  try {
    const id = uuidv7()
    const bytes = uuidv7.toBytes(id)
    const restored = uuidv7.fromBytes(bytes)
    return c.json({
      success: true,
      original: id,
      bytes: Array.from(bytes),
      restored,
      roundTripMatch: id.toLowerCase() === restored,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v7/timestamp', (c) => {
  try {
    const before = Date.now()
    const id = uuidv7()
    const after = Date.now()
    const timestamp = uuidv7.timestamp(id)
    return c.json({
      success: true,
      id,
      timestamp,
      before,
      after,
      withinRange: timestamp >= before && timestamp <= after,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v7/validate', (c) => {
  try {
    const validId = uuidv7()
    return c.json({
      success: true,
      validId,
      isValidGenerated: uuidv7.isValid(validId),
      isValidInvalid: uuidv7.isValid('not-a-uuid'),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/uuid-v7/monotonic', (c) => {
  try {
    const ids = Array.from({ length: 100 }, () => uuidv7())
    const sorted = [...ids].sort()
    const isMonotonic = ids.every((id, i) => id === sorted[i])
    return c.json({
      success: true,
      count: ids.length,
      isMonotonic,
      first: ids[0],
      last: ids[ids.length - 1],
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// TypeID Endpoints
// ============================================================================

app.get('/typeid/generate', (c) => {
  try {
    const id = typeid('user')
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/typeid/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => typeid('user'))
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/typeid/to-bytes', (c) => {
  try {
    const id = typeid('user')
    const bytes = typeid.toBytes(id)
    const restored = typeid.fromBytes('user', bytes)
    return c.json({
      success: true,
      original: id,
      bytes: Array.from(bytes),
      restored,
      roundTripMatch: id === restored,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/typeid/timestamp', (c) => {
  try {
    const before = Date.now()
    const id = typeid('user')
    const after = Date.now()
    const timestamp = typeid.timestamp(id)
    return c.json({
      success: true,
      id,
      timestamp,
      before,
      after,
      withinRange: timestamp >= before && timestamp <= after,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/typeid/validate', (c) => {
  try {
    const validId = typeid('user')
    return c.json({
      success: true,
      validId,
      isValidGenerated: typeid.isValid(validId),
      isValidInvalid: typeid.isValid('not-a-typeid'),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/typeid/monotonic', (c) => {
  try {
    const ids = Array.from({ length: 100 }, () => typeid('user'))
    const sorted = [...ids].sort()
    const isMonotonic = ids.every((id, i) => id === sorted[i])
    return c.json({
      success: true,
      count: ids.length,
      isMonotonic,
      first: ids[0],
      last: ids[ids.length - 1],
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// ULID Endpoints
// ============================================================================

app.get('/ulid/generate', (c) => {
  try {
    const id = ulid()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ulid/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => ulid())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ulid/to-bytes', (c) => {
  try {
    const id = ulid()
    const bytes = ulid.toBytes(id)
    const restored = ulid.fromBytes(bytes)
    return c.json({
      success: true,
      original: id,
      bytes: Array.from(bytes),
      restored,
      roundTripMatch: id === restored,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ulid/timestamp', (c) => {
  try {
    const before = Date.now()
    const id = ulid()
    const after = Date.now()
    const timestamp = ulid.timestamp(id)
    return c.json({
      success: true,
      id,
      timestamp,
      before,
      after,
      withinRange: timestamp >= before && timestamp <= after,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ulid/validate', (c) => {
  try {
    const validId = ulid()
    return c.json({
      success: true,
      validId,
      isValidGenerated: ulid.isValid(validId),
      isValidInvalid: ulid.isValid('not-a-ulid'),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ulid/monotonic', (c) => {
  try {
    const ids = Array.from({ length: 100 }, () => ulid())
    const sorted = [...ids].sort()
    const isMonotonic = ids.every((id, i) => id === sorted[i])
    return c.json({
      success: true,
      count: ids.length,
      isMonotonic,
      first: ids[0],
      last: ids[ids.length - 1],
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// KSUID Endpoints
// ============================================================================

app.get('/ksuid/generate', (c) => {
  try {
    const id = ksuid()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ksuid/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => ksuid())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ksuid/to-bytes', (c) => {
  try {
    const id = ksuid()
    const bytes = ksuid.toBytes(id)
    const restored = ksuid.fromBytes(bytes)
    return c.json({
      success: true,
      original: id,
      bytes: Array.from(bytes),
      restored,
      roundTripMatch: id === restored,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ksuid/timestamp', (c) => {
  try {
    const before = Date.now()
    const id = ksuid()
    const after = Date.now()
    const timestamp = ksuid.timestamp(id)
    // KSUID has second precision, so timestamp should be within 1 second of generation time
    const beforeSec = Math.floor(before / 1000) * 1000
    const afterSec = Math.ceil(after / 1000) * 1000
    return c.json({
      success: true,
      id,
      timestamp,
      before,
      after,
      withinRange: timestamp >= beforeSec && timestamp <= afterSec,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ksuid/validate', (c) => {
  try {
    const validId = ksuid()
    return c.json({
      success: true,
      validId,
      isValidGenerated: ksuid.isValid(validId),
      isValidKnownGood: ksuid.isValid('0ujsswThIGTUYm2K8FjOOfXtY1K'),
      isValidInvalid: ksuid.isValid('not-a-ksuid'),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/ksuid/monotonic', (c) => {
  try {
    const ids = Array.from({ length: 100 }, () => ksuid())
    const sorted = [...ids].sort()
    const isMonotonic = ids.every((id, i) => id === sorted[i])
    return c.json({
      success: true,
      count: ids.length,
      isMonotonic,
      first: ids[0],
      last: ids[ids.length - 1],
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// CUID2 Endpoints
// ============================================================================

app.get('/cuid2/generate', (c) => {
  try {
    const id = cuid2()
    return c.json({ success: true, id, length: id.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/cuid2/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => cuid2())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/cuid2/generate-custom-length', (c) => {
  try {
    const length = Number(c.req.query('length') || '24')
    const id = cuid2({ length })
    return c.json({
      success: true,
      id,
      requestedLength: length,
      actualLength: id.length,
      lengthMatch: id.length === length,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/cuid2/validate', (c) => {
  try {
    const validId = cuid2()
    return c.json({
      success: true,
      validId,
      isValidGenerated: cuid2.isValid(validId),
      isValidInvalid: cuid2.isValid('123invalid'),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ============================================================================
// Nanoid Endpoints
// ============================================================================

app.get('/nanoid/generate', (c) => {
  try {
    const id = nanoid()
    return c.json({ success: true, id, length: id.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/nanoid/generate-batch', (c) => {
  try {
    const count = Number(c.req.query('count') || '1000')
    const ids = Array.from({ length: count }, () => nanoid())
    return c.json({ success: true, ids, count: ids.length })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/nanoid/generate-custom-size', (c) => {
  try {
    const size = Number(c.req.query('size') || '21')
    const id = nanoid(size)
    return c.json({
      success: true,
      id,
      requestedSize: size,
      actualSize: id.length,
      sizeMatch: id.length === size,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/nanoid/generate-custom-alphabet', (c) => {
  try {
    const alphabet = c.req.query('alphabet') || '0123456789abcdef'
    const size = Number(c.req.query('size') || '12')
    const id = nanoid({ alphabet, size })
    const allCharsValid = [...id].every((char) => alphabet.includes(char))
    return c.json({
      success: true,
      id,
      alphabet,
      size,
      allCharsValid,
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/nanoid/validate', (c) => {
  try {
    const validId = nanoid()
    return c.json({
      success: true,
      validId,
      isValidGenerated: nanoid.isValid(validId),
      isValidInvalid: nanoid.isValid('invalid!@#'),
      isValidEmpty: nanoid.isValid(''),
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.get('/nanoid/url-alphabet', (c) => {
  return c.json({
    success: true,
    urlAlphabet: URL_ALPHABET,
    length: URL_ALPHABET.length,
  })
})

export default app
