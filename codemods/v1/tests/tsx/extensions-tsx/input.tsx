import { nanoid as createNanoid } from 'uniku/nanoid'

export const value = <code>{createNanoid({ size: 8 })}</code>
