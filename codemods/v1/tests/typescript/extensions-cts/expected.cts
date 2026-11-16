export async function create(): Promise<string> {
  const { ksuid } = await import('uniku/ksuid')
  return ksuid({ msecs: 2 * 1000 })
}
