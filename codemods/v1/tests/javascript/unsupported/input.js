import { cuid2 } from 'uniku/cuid2'
import { uuidv7 } from 'uniku/uuid/v7'
import { xid } from 'uniku/xid'

const cuidv2 = () => 'occupied'
const shared = { value: 1 }

const first = uuidv7({ seq: 1, counter: 2 })
const second = uuidv7({ ...shared, seq: 2 })
const third = xid({ ['other']: 1, secs: 3 })
const fourth = require('uniku/xid').xid({ secs: 4 })
const fifth = cuid2()
const sixth = uuidv7({ ['seq']: 3 })

export { first, second, third, fourth, fifth, sixth, cuidv2 }
