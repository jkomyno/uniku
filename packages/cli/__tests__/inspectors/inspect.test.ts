import { cuid2 } from 'uniku/cuid2'
import { ksuid } from 'uniku/ksuid'
import { nanoid } from 'uniku/nanoid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import { describe, expect, it } from 'vitest'
import { inspectId } from '@/src/inspectors/inspect'

describe('inspectId', () => {
  it('inspects UUID v7 with timestamp and random', () => {
    const id = uuidv7()
    const result = inspectId(id, 'uuid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('uuid')
    expect(result!.version).toBe(7)
    expect(result!.timestamp).toBeDefined()
    expect(result!.timestamp_ms).toBeTypeOf('number')
    expect(result!.random).toBeDefined()
  })

  it('inspects UUID v4 with no-metadata note', () => {
    const id = uuidv4()
    const result = inspectId(id, 'uuid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('uuid')
    expect(result!.version).toBe(4)
    expect(result!.note).toContain('no decodable metadata')
  })

  it('inspects ULID with timestamp', () => {
    const id = ulid()
    const result = inspectId(id, 'ulid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('ulid')
    expect(result!.timestamp).toBeDefined()
    expect(result!.timestamp_ms).toBeTypeOf('number')
    expect(result!.random).toBeDefined()
  })

  it('inspects TypeID with prefix, suffix, timestamp, and random payload', () => {
    const id = typeid('user')
    const result = inspectId(id, 'typeid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('typeid')
    expect(result!.version).toBe(7)
    expect(result!.prefix).toBe('user')
    expect(result!.suffix).toHaveLength(26)
    expect(result!.timestamp).toBeDefined()
    expect(result!.timestamp_ms).toBeTypeOf('number')
    expect(result!.random).toBeDefined()
  })

  it('inspects KSUID with timestamp and random payload', () => {
    const id = ksuid()
    const result = inspectId(id, 'ksuid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('ksuid')
    expect(result!.timestamp).toBeDefined()
    expect(result!.timestamp_ms).toBeTypeOf('number')
    expect(result!.random).toBeDefined()
  })

  it('inspects CUID with no-metadata note', () => {
    const id = cuid2()
    const result = inspectId(id, 'cuid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('cuid')
    expect(result!.note).toContain('no decodable metadata')
  })

  it('inspects Nanoid with no-metadata note', () => {
    const id = nanoid()
    const result = inspectId(id, 'nanoid')
    expect(result).not.toBeNull()
    expect(result!.type).toBe('nanoid')
    expect(result!.note).toContain('no decodable metadata')
  })

  it('auto-detects UUID v7 when type is not provided', () => {
    const id = uuidv7()
    const result = inspectId(id)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('uuid')
    expect(result!.version).toBe(7)
  })

  it('auto-detects TypeID when type is not provided', () => {
    const id = typeid('user')
    const result = inspectId(id)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('typeid')
    expect(result!.version).toBe(7)
  })

  it('returns null for unrecognizable ID', () => {
    const result = inspectId('!!!not-an-id!!!')
    expect(result).toBeNull()
  })
})
