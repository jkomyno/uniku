import { isWritableRange } from '../common/validation'
import { BufferError, InvalidInputError } from '../errors'
import { sha1Digest128Into, sha1PaddedLength } from './common/sha1'
import { formatUuid, formatUuidUnchecked, parseUuid } from './common/uuid'

const UUID_BYTES = 16
// Names that fit hash in this reused buffer; larger ones get a one-off allocation.
const SCRATCH_BYTES = 512
const scratch = new Uint8Array(SCRATCH_BYTES)
const scratchName = scratch.subarray(UUID_BYTES)
const reusableBuf = new Uint8Array(UUID_BYTES)
const encoder = /*@__PURE__*/ new TextEncoder()

/**
 * The input a UUID v5 is derived from: a string, hashed as UTF-8 without Unicode
 * normalization, or raw bytes.
 */
export type UuidV5Name = string | Uint8Array

/** A namespace UUID, as a UUID string or its 16 canonical bytes. */
export type UuidV5Namespace = string | Uint8Array

/** Derives UUID v5 values for one namespace. Returned by `uuidv5.namespace()`. */
export type UuidV5Deriver = {
  /** Derive the UUID v5 string for a name. */
  (name: UuidV5Name, buf?: undefined, offset?: number): string
  /** Derive the UUID v5 for a name and write its 16 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(name: UuidV5Name, buf: TBuf, offset?: number): TBuf
}

export type UuidV5 = {
  /** Derive the UUID v5 string for a name within a namespace. */
  (name: UuidV5Name, namespace: UuidV5Namespace, buf?: undefined, offset?: number): string
  /** Derive the UUID v5 for a name within a namespace and write its 16 canonical bytes into a caller-owned buffer. */
  <TBuf extends Uint8Array = Uint8Array>(name: UuidV5Name, namespace: UuidV5Namespace, buf: TBuf, offset?: number): TBuf
  /** Validate and parse a namespace once, and return a function that derives IDs within it. */
  namespace(namespace: UuidV5Namespace): UuidV5Deriver
  /** Convert a UUID v5 string to its canonical 16-byte representation. */
  toBytes(id: string): Uint8Array
  /** Convert 16 canonical UUID bytes to a UUID v5 string. */
  fromBytes(bytes: Uint8Array): string
  /** Return whether a value is a syntactically valid UUID v5 string. */
  isValid(id: unknown): id is string
  /** The RFC 9562 namespace for fully qualified domain names. */
  DNS: string
  /** The RFC 9562 namespace for URLs. */
  URL: string
  /** The RFC 9562 namespace for ISO object identifiers (OIDs). */
  OID: string
  /** The RFC 9562 namespace for X.500 distinguished names. */
  X500: string
  /** The nil UUID (all zeros) */
  NIL: string
  /** The max UUID (all ones) */
  MAX: string
}

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseNamespace(namespace: UuidV5Namespace): Uint8Array {
  if (typeof namespace === 'string') {
    return parseUuid(namespace)
  }

  if (namespace.length !== UUID_BYTES) {
    throw new InvalidInputError(
      'BYTES_INVALID_LENGTH',
      `UUID v5 namespace must be exactly ${UUID_BYTES} bytes, got ${namespace.length}`,
      { strategy: 'uuid' },
    )
  }

  return namespace
}

function writeV5BytesUnchecked(namespace: Uint8Array, name: UuidV5Name, out: Uint8Array, offset: number): void {
  let msg: Uint8Array
  let length: number

  if (typeof name === 'string') {
    // UTF-8 needs at most 3 bytes per UTF-16 code unit.
    const capacity = sha1PaddedLength(UUID_BYTES + name.length * 3)
    msg = capacity <= SCRATCH_BYTES ? scratch : new Uint8Array(capacity)
    const nameRegion = msg === scratch ? scratchName : msg.subarray(UUID_BYTES)
    length = UUID_BYTES + encoder.encodeInto(name, nameRegion).written
  } else {
    length = UUID_BYTES + name.length
    const capacity = sha1PaddedLength(length)
    msg = capacity <= SCRATCH_BYTES ? scratch : new Uint8Array(capacity)
    msg.set(name, UUID_BYTES)
  }

  // Name and namespace are copied before `out` is written, so either may alias it.
  msg.set(namespace)
  sha1Digest128Into(msg, length, out, offset)

  // Set RFC 9562 version (5) and variant (10xx) bits.
  out[offset + 6] = (out[offset + 6] & 0x0f) | 0x50
  out[offset + 8] = (out[offset + 8] & 0x3f) | 0x80
}

function derive<TBuf extends Uint8Array = Uint8Array>(
  namespace: Uint8Array,
  name: UuidV5Name,
  buf?: TBuf,
  offset?: number,
): string | TBuf {
  if (!buf) {
    writeV5BytesUnchecked(namespace, name, reusableBuf, 0)
    return formatUuidUnchecked(reusableBuf)
  }

  const outputOffset = offset ?? 0
  if (!isWritableRange(buf, outputOffset, UUID_BYTES)) {
    throw new BufferError(
      'BUFFER_OUT_OF_BOUNDS',
      `UUID byte range ${outputOffset}:${outputOffset + UUID_BYTES - 1} is out of buffer bounds`,
      { strategy: 'uuid' },
    )
  }

  writeV5BytesUnchecked(namespace, name, buf, outputOffset)
  return buf
}

/*
 * Overload: no buffer => return a UUID string.
 */
function v5(name: UuidV5Name, namespace: UuidV5Namespace, buf?: undefined, offset?: number): string
/*
 * Overload: caller provides a buffer slice to fill with UUID bytes.
 */
function v5<TBuf extends Uint8Array = Uint8Array>(
  name: UuidV5Name,
  namespace: UuidV5Namespace,
  buf: TBuf,
  offset?: number,
): TBuf
function v5<TBuf extends Uint8Array = Uint8Array>(
  name: UuidV5Name,
  namespace: UuidV5Namespace,
  buf?: TBuf,
  offset?: number,
): string | TBuf {
  return derive(parseNamespace(namespace), name, buf, offset)
}

function namespace(namespace: UuidV5Namespace): UuidV5Deriver {
  // Copy caller bytes so later mutation cannot change derived IDs. `new Uint8Array()` always copies,
  // unlike `.slice()` on a Node.js Buffer, which returns a view of the same memory.
  const namespaceBytes =
    typeof namespace === 'string' ? parseUuid(namespace) : new Uint8Array(parseNamespace(namespace))

  function deriver(name: UuidV5Name, buf?: undefined, offset?: number): string
  function deriver<TBuf extends Uint8Array = Uint8Array>(name: UuidV5Name, buf: TBuf, offset?: number): TBuf
  function deriver<TBuf extends Uint8Array = Uint8Array>(name: UuidV5Name, buf?: TBuf, offset?: number): string | TBuf {
    return derive(namespaceBytes, name, buf, offset)
  }

  return deriver
}

function isValid(id: unknown): id is string {
  return typeof id === 'string' && UUID_V5_REGEX.test(id)
}

/**
 * Derive a UUID v5 from a name and a namespace, or write its bytes into a buffer.
 *
 * UUID v5 (RFC 9562 section 5.5) is name-based: it hashes the namespace and
 * name with SHA-1, so the same inputs give the same ID in every process, on
 * every runtime, with no state to keep. Use it to derive a stable ID from an
 * identifier you already hold.
 *
 * String names are hashed as UTF-8 without Unicode normalization. A UUID v5 is
 * an identifier, not a secret: anyone who knows or can guess the name and
 * namespace can compute it, and SHA-1 lets someone who controls the names craft
 * two that collide.
 *
 * @example
 * ```ts
 * import { uuidv5 } from 'uniku/uuid/v5'
 *
 * const id = uuidv5('www.example.com', uuidv5.DNS)
 * // => "2ed6657d-e927-568b-95e1-2665a8aea6a2"
 *
 * // Parse a namespace once and derive many IDs within it
 * const sessionId = uuidv5.namespace('1b671a64-40d5-491e-99b0-da01ff1f3341')
 * sessionId('tool-a:3f2c')
 *
 * // Validate
 * uuidv5.isValid(id) // true
 * ```
 */
export const uuidv5: UuidV5 = Object.assign(v5, {
  namespace,
  toBytes: parseUuid,
  fromBytes: formatUuid,
  isValid,
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
})

export { BufferError, InvalidInputError, ParseError, UniqueIdError } from '../errors'
