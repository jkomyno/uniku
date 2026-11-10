/**
 * Minimal synchronous SHA-1 (FIPS 180-4) for name-based UUIDs.
 *
 * Web Crypto's `digest()` is async and every uniku generator is synchronous,
 * so `uuid/v5` carries its own SHA-1 instead of returning a promise or adding a
 * dependency. It serves identity only, never as a security primitive.
 */

const W = new Int32Array(80)

/** Size of the buffer SHA-1 needs to pad a `length`-byte message: a multiple of 64 with room for 9 more bytes. */
export function sha1PaddedLength(length: number): number {
  return (Math.floor((length + 8) / 64) + 1) * 64
}

/**
 * Hash `msg[0, length)` and write the first 16 digest bytes to `out[offset, offset + 16)`.
 *
 * `msg` is caller-owned scratch space of at least `sha1PaddedLength(length)` bytes.
 * Bytes from `length` on are overwritten with padding, so stale contents are fine.
 */
export function sha1Digest128Into(msg: Uint8Array, length: number, out: Uint8Array, offset: number): void {
  const padded = sha1PaddedLength(length)
  msg[length] = 0x80
  msg.fill(0, length + 1, padded - 8)

  // Message length in bits as a 64-bit big-endian integer.
  const bitsHigh = Math.floor(length / 0x20000000)
  const bitsLow = (length << 3) >>> 0
  msg[padded - 8] = bitsHigh >>> 24
  msg[padded - 7] = bitsHigh >>> 16
  msg[padded - 6] = bitsHigh >>> 8
  msg[padded - 5] = bitsHigh
  msg[padded - 4] = bitsLow >>> 24
  msg[padded - 3] = bitsLow >>> 16
  msg[padded - 2] = bitsLow >>> 8
  msg[padded - 1] = bitsLow

  let h0 = 0x67452301
  let h1 = 0xefcdab89 | 0
  let h2 = 0x98badcfe | 0
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0 | 0

  for (let block = 0; block < padded; block += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = block + i * 4
      W[i] = (msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]
    }
    for (let i = 16; i < 80; i += 1) {
      const x = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]
      W[i] = (x << 1) | (x >>> 31)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let i = 0; i < 80; i += 1) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc | 0
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6 | 0
      }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) | 0
      e = d
      d = c
      c = (b << 30) | (b >>> 2)
      b = a
      a = t
    }

    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
  }

  writeWord(out, offset, h0)
  writeWord(out, offset + 4, h1)
  writeWord(out, offset + 8, h2)
  writeWord(out, offset + 12, h3)
}

function writeWord(out: Uint8Array, offset: number, word: number): void {
  out[offset] = word >>> 24
  out[offset + 1] = word >>> 16
  out[offset + 2] = word >>> 8
  out[offset + 3] = word
}
