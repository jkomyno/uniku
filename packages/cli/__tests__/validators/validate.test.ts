import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
import { objectid } from 'uniku/objectid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { describe, expect, it } from 'vitest'
import { validateAs, validateAutoDetect } from '@/src/validators/validate'

describe('validateAs', () => {
  it('validates a valid UUID v4', () => {
    const id = uuidv4()
    const result = validateAs(id, 'uuid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('uuid')
    expect(result.version).toBe(4)
  })

  it('validates a valid UUID v7', () => {
    const id = uuidv7()
    const result = validateAs(id, 'uuid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('uuid')
    expect(result.version).toBe(7)
  })

  it('rejects an invalid UUID', () => {
    const result = validateAs('not-a-uuid', 'uuid')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('invalid UUID')
  })

  it('validates a valid ULID', () => {
    const id = ulid()
    const result = validateAs(id, 'ulid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ulid')
  })

  it('rejects an invalid ULID', () => {
    const result = validateAs('bad-ulid', 'ulid')
    expect(result.valid).toBe(false)
  })

  it('validates a valid TypeID', () => {
    const id = typeid('user')
    const result = validateAs(id, 'typeid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('typeid')
    expect(result.version).toBe(7)
  })

  it('rejects an invalid TypeID', () => {
    const result = validateAs('user_not-a-typeid', 'typeid')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('invalid TypeID')
  })

  it('validates a valid KSUID', () => {
    const id = ksuid()
    const result = validateAs(id, 'ksuid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ksuid')
  })

  it('validates a valid ObjectID', () => {
    const id = objectid()
    const result = validateAs(id, 'objectid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('objectid')
  })

  it('validates a valid CUID', () => {
    const id = cuid2()
    const result = validateAs(id, 'cuid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('cuid')
  })

  it('validates a valid Nanoid', () => {
    const id = nanoid()
    const result = validateAs(id, 'nanoid')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('nanoid')
  })

  it('rejects a ULID when validated as UUID (cross-type mismatch)', () => {
    const id = ulid()
    const result = validateAs(id, 'uuid')
    expect(result.valid).toBe(false)
  })
})

describe('validateAutoDetect', () => {
  it('auto-detects UUID v4', () => {
    const id = uuidv4()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('uuid')
    expect(result.version).toBe(4)
  })

  it('auto-detects UUID v7', () => {
    const id = uuidv7()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('uuid')
    expect(result.version).toBe(7)
  })

  it('auto-detects ULID', () => {
    const id = ulid()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ulid')
  })

  it('auto-detects TypeID', () => {
    const id = typeid('user')
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('typeid')
    expect(result.version).toBe(7)
  })

  it('auto-detects KSUID', () => {
    const id = ksuid()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ksuid')
  })

  it('auto-detects ObjectID', () => {
    const id = objectid()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('objectid')
  })

  it('auto-detects an ObjectID starting with a letter (a-f) as objectid, not cuid (KTD6/R9)', () => {
    // CUID2's default validation regex (/^[a-z][0-9a-z]+$/, length 24) would also
    // accept this string if objectid were checked after cuid2 - see validateAutoDetect's
    // ordering comment. This is a fixed known value, not a generated one, to guarantee
    // the first character is in a-f regardless of test run.
    const id = 'aabbccddeeff001122334455'
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('objectid')
  })

  it('auto-detects CUID', () => {
    const id = cuid2()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    expect(result.type).toBe('cuid')
  })

  it('auto-detects Nanoid', () => {
    const id = nanoid()
    const result = validateAutoDetect(id)
    expect(result.valid).toBe(true)
    // Nanoid may be detected as cuid or nanoid depending on its content
    expect(['nanoid', 'cuid']).toContain(result.type)
  })

  it('returns invalid for malformed input', () => {
    const result = validateAutoDetect('!!!invalid!!!')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('malformed identifier')
  })

  it('returns invalid for empty string', () => {
    const result = validateAutoDetect('')
    expect(result.valid).toBe(false)
  })
})
