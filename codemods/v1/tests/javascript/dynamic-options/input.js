import { objectid } from 'uniku/objectid'
import { nanoid } from 'uniku/nanoid'
import { typeid } from 'uniku/typeid'

const options = { alphabet: 'abc', size: 12 }
export const ids = [
  objectid({ secs: undefined }),
  objectid({ secs: null }),
  objectid({ secs: 1.5 }),
  objectid({ secs: settings.secs }),
  objectid({ secs }),
  nanoid(options),
  nanoid(length),
  typeid(...args),
]
