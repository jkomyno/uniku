import { BufferError, ParseError } from '../errors'

const ENCODING = '0123456789abcdefghijklmnopqrstuv'
const XID_BYTES = 12
const XID_LENGTH = 20

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

  return (
    ENCODING[bytes[0] >> 3] +
    ENCODING[((bytes[0] << 2) | (bytes[1] >> 6)) & 0x1f] +
    ENCODING[(bytes[1] >> 1) & 0x1f] +
    ENCODING[((bytes[1] << 4) | (bytes[2] >> 4)) & 0x1f] +
    ENCODING[((bytes[2] << 1) | (bytes[3] >> 7)) & 0x1f] +
    ENCODING[(bytes[3] >> 2) & 0x1f] +
    ENCODING[((bytes[3] << 3) | (bytes[4] >> 5)) & 0x1f] +
    ENCODING[bytes[4] & 0x1f] +
    ENCODING[bytes[5] >> 3] +
    ENCODING[((bytes[5] << 2) | (bytes[6] >> 6)) & 0x1f] +
    ENCODING[(bytes[6] >> 1) & 0x1f] +
    ENCODING[((bytes[6] << 4) | (bytes[7] >> 4)) & 0x1f] +
    ENCODING[((bytes[7] << 1) | (bytes[8] >> 7)) & 0x1f] +
    ENCODING[(bytes[8] >> 2) & 0x1f] +
    ENCODING[((bytes[8] << 3) | (bytes[9] >> 5)) & 0x1f] +
    ENCODING[bytes[9] & 0x1f] +
    ENCODING[bytes[10] >> 3] +
    ENCODING[((bytes[10] << 2) | (bytes[11] >> 6)) & 0x1f] +
    ENCODING[(bytes[11] >> 1) & 0x1f] +
    ENCODING[(bytes[11] << 4) & 0x1f]
  )
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
