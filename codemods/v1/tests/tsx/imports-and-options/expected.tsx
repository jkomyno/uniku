import * as ids from 'uniku/uuid/v7'
import { ksuid } from 'uniku/ksuid'

export function Preview(): JSX.Element {
  const value = ids.uuidv7({ counter: 3 })
  const sortable = ksuid({ msecs: (readSeconds() + 1) * 1000 })
  return <output data-sortable={sortable}>{value}</output>
}
