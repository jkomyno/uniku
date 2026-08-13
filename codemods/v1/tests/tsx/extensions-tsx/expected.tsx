import { nanoid as createNanoid } from 'uniku/nanoid'

export const value = <code>{createNanoid({ length: 8 })}</code>
