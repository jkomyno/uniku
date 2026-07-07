import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

/**
 * Generator configuration for parameterized tests
 */
const generators = [
  { name: 'uuid-v4', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  { name: 'uuid-v7', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  { name: 'typeid', pattern: /^user_[0-7][0-9abcdefghjkmnpqrstvwxyz]{25}$/ },
  { name: 'ulid', pattern: /^[0-9A-HJKMNP-TV-Z]{26}$/ },
  { name: 'ksuid', pattern: /^[0-9A-Za-z]{27}$/ },
  { name: 'objectid', pattern: /^[0-9a-f]{24}$/i },
  { name: 'cuid2', pattern: /^[a-z][a-z0-9]+$/ },
  { name: 'nanoid', pattern: /^[A-Za-z0-9_-]+$/ },
] as const

const generatorsWithBytes = [
  { name: 'uuid-v4', byteLength: 16 },
  { name: 'uuid-v7', byteLength: 16 },
  { name: 'typeid', byteLength: 16 },
  { name: 'ulid', byteLength: 16 },
  { name: 'ksuid', byteLength: 20 },
  { name: 'objectid', byteLength: 12 },
] as const
const generatorsWithTimestamp = ['uuid-v7', 'typeid', 'ulid', 'objectid'] as const

describe('ID generators on Cloudflare Workers', () => {
  // =========================================================================
  // Common tests for all generators using it.each
  // =========================================================================

  describe('generation', () => {
    it.each(generators)('$name generates valid IDs', async ({ name, pattern }) => {
      const response = await SELF.fetch(`http://localhost/${name}/generate`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; id: string }
      expect(body.success).toBe(true)
      expect(body.id).toMatch(pattern)
    })
  })

  describe('uniqueness', () => {
    it.each(generators)('$name generates 1000 unique IDs', async ({ name }) => {
      const response = await SELF.fetch(`http://localhost/${name}/generate-batch`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; ids: string[]; count: number }
      expect(body.success).toBe(true)
      expect(body.count).toBe(1000)
      expect(new Set(body.ids).size).toBe(1000)
    })
  })

  describe('validation', () => {
    it.each(generators)('$name validates IDs correctly', async ({ name }) => {
      const response = await SELF.fetch(`http://localhost/${name}/validate`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as {
        success: boolean
        isValidGenerated: boolean
        isValidInvalid: boolean
      }
      expect(body.success).toBe(true)
      expect(body.isValidGenerated).toBe(true)
      expect(body.isValidInvalid).toBe(false)
    })
  })

  // =========================================================================
  // Byte conversion tests for generators with canonical binary encodings.
  // =========================================================================

  describe('byte conversion', () => {
    it.each(generatorsWithBytes)('$name round-trips through toBytes/fromBytes', async ({ name, byteLength }) => {
      const response = await SELF.fetch(`http://localhost/${name}/to-bytes`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as {
        success: boolean
        roundTripMatch: boolean
        bytes: number[]
      }
      expect(body.success).toBe(true)
      expect(body.roundTripMatch).toBe(true)
      expect(body.bytes).toHaveLength(byteLength)
    })
  })

  // =========================================================================
  // Timestamp & monotonic tests (uuid-v7, ulid only)
  // =========================================================================

  describe('timestamp extraction', () => {
    it.each(generatorsWithTimestamp)('%s extracts timestamp within range', async (name) => {
      const response = await SELF.fetch(`http://localhost/${name}/timestamp`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; withinRange: boolean }
      expect(body.success).toBe(true)
      expect(body.withinRange).toBe(true)
    })
  })

  describe('monotonic ordering', () => {
    it.each(generatorsWithTimestamp)('%s generates monotonically increasing IDs', async (name) => {
      const response = await SELF.fetch(`http://localhost/${name}/monotonic`)
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; isMonotonic: boolean }
      expect(body.success).toBe(true)
      expect(body.isMonotonic).toBe(true)
    })
  })

  // =========================================================================
  // Generator-specific tests
  // =========================================================================

  describe('cuid2 custom length', () => {
    it('generates IDs with custom length', async () => {
      const response = await SELF.fetch('http://localhost/cuid2/generate-custom-length?length=32')
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; lengthMatch: boolean; actualLength: number }
      expect(body.success).toBe(true)
      expect(body.lengthMatch).toBe(true)
      expect(body.actualLength).toBe(32)
    })
  })

  describe('nanoid custom options', () => {
    it('generates IDs with custom size', async () => {
      const response = await SELF.fetch('http://localhost/nanoid/generate-custom-size?size=10')
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; sizeMatch: boolean; actualSize: number }
      expect(body.success).toBe(true)
      expect(body.sizeMatch).toBe(true)
      expect(body.actualSize).toBe(10)
    })

    it('generates IDs with hex alphabet', async () => {
      const response = await SELF.fetch(
        'http://localhost/nanoid/generate-custom-alphabet?alphabet=0123456789abcdef&size=12',
      )
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; id: string; allCharsValid: boolean }
      expect(body.success).toBe(true)
      expect(body.allCharsValid).toBe(true)
      expect(body.id).toMatch(/^[0-9a-f]+$/)
    })

    it('exports correct URL_ALPHABET', async () => {
      const response = await SELF.fetch('http://localhost/nanoid/url-alphabet')
      expect(response.status).toBe(200)

      const body = (await response.json()) as { success: boolean; urlAlphabet: string; length: number }
      expect(body.success).toBe(true)
      expect(body.urlAlphabet).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-')
      expect(body.length).toBe(64)
    })
  })
})
