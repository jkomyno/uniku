export async function create(): Promise<string> {
  const { cuid2: createCuid } = await import('uniku/cuid2')
  return createCuid()
}
