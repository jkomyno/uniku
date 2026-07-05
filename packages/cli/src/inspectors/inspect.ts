import { ksuid } from 'uniku/ksuid'
import { typeid } from 'uniku/typeid'
import { ulid } from 'uniku/ulid'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv7 } from 'uniku/uuid/v7'
import type { IdType, InspectResult } from '@/src/domain/types'
import { validateAutoDetect } from '@/src/validators/validate'

/**
 * Inspect an ID and extract metadata.
 * If type is not provided, auto-detect is used.
 */
export function inspectId(id: string, type?: IdType): InspectResult | null {
  const resolvedType = type ?? detectType(id)
  if (!resolvedType) return null

  switch (resolvedType) {
    case 'uuid':
      return inspectUuid(id)
    case 'ulid':
      return inspectUlid(id)
    case 'typeid':
      return inspectTypeid(id)
    case 'ksuid':
      return inspectKsuid(id)
    case 'cuid':
      return inspectCuid(id)
    case 'nanoid':
      return inspectNanoid(id)
  }
}

function detectType(id: string): IdType | null {
  const result = validateAutoDetect(id)
  return result.valid ? (result.type ?? null) : null
}

function inspectUuid(id: string): InspectResult {
  if (uuidv7.isValid(id)) {
    const ms = uuidv7.timestamp(id)
    const bytes = uuidv7.toBytes(id)
    // Random component: last 6 bytes (bytes 10-15)
    const random = Buffer.from(bytes.slice(10)).toString('hex')
    return {
      id,
      type: 'uuid',
      version: 7,
      timestamp: new Date(ms).toISOString(),
      timestamp_ms: ms,
      random,
    }
  }

  if (uuidv4.isValid(id)) {
    return {
      id,
      type: 'uuid',
      version: 4,
      note: 'This ID type contains no decodable metadata.',
    }
  }

  return {
    id,
    type: 'uuid',
    note: 'Unrecognized UUID version.',
  }
}

function inspectUlid(id: string): InspectResult {
  const ms = ulid.timestamp(id)
  // Random component: last 16 chars of the 26-char ULID
  const random = id.slice(10)
  return {
    id,
    type: 'ulid',
    timestamp: new Date(ms).toISOString(),
    timestamp_ms: ms,
    random,
  }
}

function inspectTypeid(id: string): InspectResult {
  if (!typeid.isValid(id)) {
    return {
      id,
      type: 'typeid',
      note: 'Unrecognized TypeID format.',
    }
  }

  const ms = typeid.timestamp(id)
  const bytes = typeid.toBytes(id)
  // UUID v7 random component: last 6 bytes (bytes 10-15)
  const random = Buffer.from(bytes.slice(10)).toString('hex')
  return {
    id,
    type: 'typeid',
    version: 7,
    prefix: typeid.prefix(id),
    suffix: typeid.suffix(id),
    timestamp: new Date(ms).toISOString(),
    timestamp_ms: ms,
    random,
  }
}

function inspectKsuid(id: string): InspectResult {
  const ms = ksuid.timestamp(id)
  const bytes = ksuid.toBytes(id)
  // Random payload: last 16 bytes (bytes 4-19)
  const random = Buffer.from(bytes.slice(4)).toString('hex')
  return {
    id,
    type: 'ksuid',
    timestamp: new Date(ms).toISOString(),
    timestamp_ms: ms,
    random,
  }
}

function inspectCuid(id: string): InspectResult {
  return {
    id,
    type: 'cuid',
    note: 'This ID type contains no decodable metadata.',
  }
}

function inspectNanoid(id: string): InspectResult {
  return {
    id,
    type: 'nanoid',
    note: 'This ID type contains no decodable metadata.',
  }
}
