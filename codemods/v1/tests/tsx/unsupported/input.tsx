import { nanoid } from 'uniku/nanoid'

const options = { size: 8 }

export const value = <code>{nanoid({ ...options, size: 8 })}</code>
