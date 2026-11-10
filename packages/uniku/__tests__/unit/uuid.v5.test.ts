import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { BufferError, InvalidInputError, ParseError } from '@/src/errors'
import { formatUuid, parseUuid } from '@/src/uuid/common/uuid'
import { uuidv5 } from '@/src/uuid/v5'

// Independent oracle: RFC 9562 section 5.5 computed with node:crypto's SHA-1.
function referenceV5(name: string | Uint8Array, namespace: string): string {
  const nameBytes = typeof name === 'string' ? Buffer.from(name, 'utf8') : name
  const digest = createHash('sha1').update(parseUuid(namespace)).update(nameBytes).digest()
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  return formatUuid(new Uint8Array(digest.subarray(0, 16)))
}

function seededBytes(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length)
  let state = seed
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    bytes[i] = state >>> 24
  }
  return bytes
}

const APP_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

describe('uuidv5', () => {
  it('matches the RFC 9562 appendix A.4 test vector', () => {
    expect(uuidv5('www.example.com', uuidv5.DNS)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
  })

  it('returns the same ID for the same name and namespace', () => {
    expect(uuidv5('tool-a:3f2c', APP_NAMESPACE)).toBe(uuidv5('tool-a:3f2c', APP_NAMESPACE))
  })

  it('returns different IDs for different names or namespaces', () => {
    expect(uuidv5('a', APP_NAMESPACE)).not.toBe(uuidv5('b', APP_NAMESPACE))
    expect(uuidv5('a', uuidv5.DNS)).not.toBe(uuidv5('a', uuidv5.URL))
  })

  it('sets version 5 and the RFC variant bits', () => {
    const bytes = uuidv5.toBytes(uuidv5('www.example.com', uuidv5.DNS))
    expect(bytes[6] >> 4).toBe(5)
    expect(bytes[8] & 0xc0).toBe(0x80)
  })

  it('exposes the RFC 9562 namespace constants', () => {
    expect(uuidv5.DNS).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
    expect(uuidv5.URL).toBe('6ba7b811-9dad-11d1-80b4-00c04fd430c8')
    expect(uuidv5.OID).toBe('6ba7b812-9dad-11d1-80b4-00c04fd430c8')
    expect(uuidv5.X500).toBe('6ba7b814-9dad-11d1-80b4-00c04fd430c8')
  })

  it('matches SHA-1 for names on both sides of every padding boundary', () => {
    // 16 namespace bytes + name: 39/40 and 103/104 bytes are where padding spills into another block.
    for (let length = 0; length <= 200; length += 1) {
      const name = seededBytes(length, length + 1)
      expect(uuidv5(name, APP_NAMESPACE), `name length ${length}`).toBe(referenceV5(name, APP_NAMESPACE))
    }
  })

  it('matches SHA-1 for a name larger than the internal scratch buffer', () => {
    const name = 'x'.repeat(10_000)
    expect(uuidv5(name, APP_NAMESPACE)).toBe(referenceV5(name, APP_NAMESPACE))
    expect(uuidv5(seededBytes(70_000, 7), APP_NAMESPACE)).toBe(referenceV5(seededBytes(70_000, 7), APP_NAMESPACE))
  })

  it('encodes string names as UTF-8', () => {
    for (const name of ['', 'é', '日本語', '🦄 unicorn', 'a\u0000b']) {
      expect(uuidv5(name, APP_NAMESPACE), name).toBe(referenceV5(name, APP_NAMESPACE))
      expect(uuidv5(name, APP_NAMESPACE)).toBe(uuidv5(new TextEncoder().encode(name), APP_NAMESPACE))
    }
  })

  it('encodes lone surrogates as U+FFFD, like TextEncoder', () => {
    expect(uuidv5('a\uD800b', APP_NAMESPACE)).toBe(uuidv5('a\uFFFDb', APP_NAMESPACE))
    expect(uuidv5('a\uDC00b', APP_NAMESPACE)).toBe(uuidv5('a\uFFFDb', APP_NAMESPACE))
  })

  it('does not normalize Unicode', () => {
    const nfc = 'café'
    const nfd = 'café'
    expect(uuidv5(nfc, APP_NAMESPACE)).not.toBe(uuidv5(nfd, APP_NAMESPACE))
  })

  it('accepts the namespace as a string in any case or as 16 bytes', () => {
    const expected = uuidv5('name', uuidv5.DNS)
    expect(uuidv5('name', uuidv5.DNS.toUpperCase())).toBe(expected)
    expect(uuidv5('name', uuidv5.toBytes(uuidv5.DNS))).toBe(expected)
  })

  it('supports chaining namespaces to compose inputs', () => {
    const tenant = uuidv5('acme', APP_NAMESPACE)
    expect(uuidv5('order-42', tenant)).toBe(referenceV5('order-42', tenant))
  })

  it('does not mutate caller-provided name or namespace bytes', () => {
    const name = seededBytes(32, 3)
    const namespace = uuidv5.toBytes(APP_NAMESPACE)
    const nameCopy = name.slice()
    const namespaceCopy = namespace.slice()
    uuidv5(name, namespace)
    expect(name).toEqual(nameCopy)
    expect(namespace).toEqual(namespaceCopy)
  })

  describe('buffer mode', () => {
    it('writes the 16 bytes at the offset and returns the same buffer', () => {
      const buf = new Uint8Array(24).fill(0xee)
      const result = uuidv5('www.example.com', uuidv5.DNS, buf, 4)
      expect(result).toBe(buf)
      expect(formatUuid(buf.subarray(4, 20))).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
      expect([...buf.subarray(0, 4), ...buf.subarray(20)]).toEqual(new Array(8).fill(0xee))
    })

    it('allows the name or namespace bytes to be the output buffer', () => {
      const name = seededBytes(16, 11)
      const expected = uuidv5(name, APP_NAMESPACE)

      const nameAsOutput = name.slice()
      expect(uuidv5.fromBytes(uuidv5(nameAsOutput, APP_NAMESPACE, nameAsOutput))).toBe(expected)

      const namespaceAsOutput = uuidv5.toBytes(APP_NAMESPACE)
      expect(uuidv5.fromBytes(uuidv5(name, namespaceAsOutput, namespaceAsOutput))).toBe(expected)
    })

    it('defaults the offset to 0', () => {
      const buf = uuidv5('www.example.com', uuidv5.DNS, new Uint8Array(16))
      expect(uuidv5.fromBytes(buf)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
    })

    it.each([
      ['negative', -1],
      ['fractional', 0.5],
      ['past the end', 1],
    ])('rejects a %s offset', (_label, offset) => {
      const buf = new Uint8Array(16)
      expect(() => uuidv5('name', uuidv5.DNS, buf, offset)).toThrow(
        expect.objectContaining({ _tag: 'BufferError', code: 'BUFFER_OUT_OF_BOUNDS', strategy: 'uuid' }),
      )
      expect(buf).toEqual(new Uint8Array(16))
    })
  })

  describe('namespace validation', () => {
    it('rejects a malformed namespace string', () => {
      expect(() => uuidv5('name', 'not-a-uuid')).toThrow(ParseError)
      expect(() => uuidv5('name', 'not-a-uuid')).toThrow(
        expect.objectContaining({ code: 'INVALID_LENGTH', strategy: 'uuid' }),
      )
      expect(() => uuidv5('name', 'zzzzzzzz-9dad-11d1-80b4-00c04fd430c8')).toThrow(
        expect.objectContaining({ _tag: 'ParseError', code: 'INVALID_CHAR' }),
      )
    })

    it('rejects namespace bytes that are not 16 bytes long', () => {
      expect(() => uuidv5('name', new Uint8Array(15))).toThrow(InvalidInputError)
      expect(() => uuidv5('name', new Uint8Array(17))).toThrow(
        expect.objectContaining({ code: 'BYTES_INVALID_LENGTH', strategy: 'uuid' }),
      )
    })
  })

  describe('namespace()', () => {
    it('derives the same IDs as the two-argument form', () => {
      const derive = uuidv5.namespace(APP_NAMESPACE)
      for (const name of ['tool-a:3f2c', 'tool-b:9a41', '', 'é']) {
        expect(derive(name)).toBe(uuidv5(name, APP_NAMESPACE))
      }
      expect(derive(seededBytes(80, 9))).toBe(uuidv5(seededBytes(80, 9), APP_NAMESPACE))
    })

    it('snapshots namespace bytes when it is created', () => {
      const namespace = uuidv5.toBytes(APP_NAMESPACE)
      const derive = uuidv5.namespace(namespace)
      namespace.fill(0)
      expect(derive('name')).toBe(uuidv5('name', APP_NAMESPACE))
    })

    it('writes into a caller buffer', () => {
      const derive = uuidv5.namespace(uuidv5.DNS)
      const buf = new Uint8Array(20)
      expect(derive('www.example.com', buf, 2)).toBe(buf)
      expect(uuidv5.fromBytes(buf.subarray(2, 18))).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
      expect(() => derive('name', buf, 5)).toThrow(BufferError)
    })

    it('validates the namespace when it is created', () => {
      expect(() => uuidv5.namespace('nope')).toThrow(ParseError)
      expect(() => uuidv5.namespace(new Uint8Array(4))).toThrow(InvalidInputError)
    })
  })

  describe('isValid', () => {
    it('accepts UUID v5 strings in either case', () => {
      const id = uuidv5('www.example.com', uuidv5.DNS)
      expect(uuidv5.isValid(id)).toBe(true)
      expect(uuidv5.isValid(id.toUpperCase())).toBe(true)
    })

    it('rejects other versions, variants, and non-strings', () => {
      expect(uuidv5.isValid('2ed6657d-e927-468b-95e1-2665a8aea6a2')).toBe(false)
      expect(uuidv5.isValid('2ed6657d-e927-568b-75e1-2665a8aea6a2')).toBe(false)
      expect(uuidv5.isValid(uuidv5.DNS)).toBe(false)
      expect(uuidv5.isValid('2ed6657de927568b95e12665a8aea6a2')).toBe(false)
      expect(uuidv5.isValid(42)).toBe(false)
      expect(uuidv5.isValid(undefined)).toBe(false)
    })
  })

  describe('codecs and constants', () => {
    it('round-trips through bytes', () => {
      const id = uuidv5('www.example.com', uuidv5.DNS)
      expect(uuidv5.fromBytes(uuidv5.toBytes(id))).toBe(id)
    })

    it('has NIL and MAX constants', () => {
      expect(uuidv5.NIL).toBe('00000000-0000-0000-0000-000000000000')
      expect(uuidv5.MAX).toBe('ffffffff-ffff-ffff-ffff-ffffffffffff')
    })

    it('rejects byte arrays that are not 16 bytes long', () => {
      expect(() => uuidv5.fromBytes(new Uint8Array(15))).toThrow(BufferError)
    })
  })
})
