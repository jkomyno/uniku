import { xid } from 'uniku/xid'

export function Preview({ xid }: { xid: (value: unknown) => string }): JSX.Element {
  return <output>{xid({ secs: 1 })}</output>
}
