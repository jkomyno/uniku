import * as ids from 'uniku/uuid/v7'
import { ksuid } from 'uniku/ksuid'

export function Preview(): JSX.Element {
  const value = ids.uuidv7({ seq: 3 })
  const sortable = ksuid({ secs: readSeconds() + 1 })
  return <output data-sortable={sortable}>{value}</output>
}
