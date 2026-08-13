export async function create(): Promise<string> {
  const { ksuid } = await import('uniku/ksuid')
  return ksuid({ secs: readSeconds() })
}
