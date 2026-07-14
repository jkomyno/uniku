import { BufferError, ParseError } from '../errors'

const ENCODING = '0123456789abcdefghijklmnopqrstuv'
const ENCODING_CODES = Uint8Array.from(ENCODING, (character) => character.charCodeAt(0))
const XID_BYTES = 12
const XID_LENGTH = 20
const ENCODED = new Array<number>(XID_LENGTH)
const COUNTER_SUFFIX = new Array<number>(6)

const DECODING = new Uint8Array(65536)
DECODING.fill(255)
for (let i = 0; i < ENCODING.length; i += 1) {
  DECODING[ENCODING.charCodeAt(i)] = i
}

/** Encode the 12 canonical XID bytes as lowercase base32hex. */
export function encodeBase32Hex(bytes: Uint8Array): string {
  if (bytes.length !== XID_BYTES) {
    throw new BufferError(
      'XID_BYTES_INVALID_LENGTH',
      `XID bytes must be exactly ${XID_BYTES} bytes, got ${bytes.length}`,
    )
  }

  ENCODED[0] = ENCODING_CODES[bytes[0] >> 3]
  ENCODED[1] = ENCODING_CODES[((bytes[0] << 2) | (bytes[1] >> 6)) & 0x1f]
  ENCODED[2] = ENCODING_CODES[(bytes[1] >> 1) & 0x1f]
  ENCODED[3] = ENCODING_CODES[((bytes[1] << 4) | (bytes[2] >> 4)) & 0x1f]
  ENCODED[4] = ENCODING_CODES[((bytes[2] << 1) | (bytes[3] >> 7)) & 0x1f]
  ENCODED[5] = ENCODING_CODES[(bytes[3] >> 2) & 0x1f]
  ENCODED[6] = ENCODING_CODES[((bytes[3] << 3) | (bytes[4] >> 5)) & 0x1f]
  ENCODED[7] = ENCODING_CODES[bytes[4] & 0x1f]
  ENCODED[8] = ENCODING_CODES[bytes[5] >> 3]
  ENCODED[9] = ENCODING_CODES[((bytes[5] << 2) | (bytes[6] >> 6)) & 0x1f]
  ENCODED[10] = ENCODING_CODES[(bytes[6] >> 1) & 0x1f]
  ENCODED[11] = ENCODING_CODES[((bytes[6] << 4) | (bytes[7] >> 4)) & 0x1f]
  ENCODED[12] = ENCODING_CODES[((bytes[7] << 1) | (bytes[8] >> 7)) & 0x1f]
  ENCODED[13] = ENCODING_CODES[(bytes[8] >> 2) & 0x1f]
  ENCODED[14] = ENCODING_CODES[((bytes[8] << 3) | (bytes[9] >> 5)) & 0x1f]
  ENCODED[15] = ENCODING_CODES[bytes[9] & 0x1f]
  ENCODED[16] = ENCODING_CODES[bytes[10] >> 3]
  ENCODED[17] = ENCODING_CODES[((bytes[10] << 2) | (bytes[11] >> 6)) & 0x1f]
  ENCODED[18] = ENCODING_CODES[(bytes[11] >> 1) & 0x1f]
  ENCODED[19] = ENCODING_CODES[(bytes[11] << 4) & 0x1f]
  return String.fromCharCode(...ENCODED)
}

/** Encode the six XID characters affected by the 24-bit counter. */
export function encodeCounterSuffix(lastIdentityByte: number, counter: number): string {
  const high = counter >>> 16
  const middle = (counter >>> 8) & 0xff
  const low = counter & 0xff
  COUNTER_SUFFIX[0] = ENCODING_CODES[((lastIdentityByte << 3) | (high >> 5)) & 0x1f]
  COUNTER_SUFFIX[1] = ENCODING_CODES[high & 0x1f]
  COUNTER_SUFFIX[2] = ENCODING_CODES[middle >> 3]
  COUNTER_SUFFIX[3] = ENCODING_CODES[((middle << 2) | (low >> 6)) & 0x1f]
  COUNTER_SUFFIX[4] = ENCODING_CODES[(low >> 1) & 0x1f]
  COUNTER_SUFFIX[5] = ENCODING_CODES[(low << 4) & 0x1f]
  return String.fromCharCode(...COUNTER_SUFFIX)
}

/** Decode a canonical lowercase base32hex XID string to its 12 bytes. */
export function decodeBase32Hex(id: string): Uint8Array {
  if (id.length !== XID_LENGTH) {
    throw new ParseError('XID_INVALID_LENGTH', `XID string must be ${XID_LENGTH} characters, got ${id.length}`)
  }

  const values = new Uint8Array(XID_LENGTH)
  for (let i = 0; i < XID_LENGTH; i += 1) {
    const value = DECODING[id.charCodeAt(i)]
    if (value === 255) {
      throw new ParseError('XID_INVALID_CHAR', `Invalid XID character: ${id[i]}`)
    }
    values[i] = value
  }

  if (values[19] !== 0 && values[19] !== 16) {
    throw new ParseError('XID_NON_CANONICAL', 'XID trailing bits must be canonically encoded')
  }

  return new Uint8Array([
    (values[0] << 3) | (values[1] >> 2),
    (values[1] << 6) | (values[2] << 1) | (values[3] >> 4),
    (values[3] << 4) | (values[4] >> 1),
    (values[4] << 7) | (values[5] << 2) | (values[6] >> 3),
    (values[6] << 5) | values[7],
    (values[8] << 3) | (values[9] >> 2),
    (values[9] << 6) | (values[10] << 1) | (values[11] >> 4),
    (values[11] << 4) | (values[12] >> 1),
    (values[12] << 7) | (values[13] << 2) | (values[14] >> 3),
    (values[14] << 5) | values[15],
    (values[16] << 3) | (values[17] >> 2),
    (values[17] << 6) | (values[18] << 1) | (values[19] >> 4),
  ])
}
