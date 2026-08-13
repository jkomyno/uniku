import { nanoid } from 'uniku/nanoid'

interface LegacyShape {
  secs: number
  seq: number
  size: number
}

const config: LegacyShape = { secs: 1, seq: 2, size: 3 }
export const values = [nanoid(10), config, 'size']
