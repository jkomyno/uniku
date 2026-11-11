export async function create(): Promise<string> {
  const { cuidv2: createCuid } = await import('uniku/cuid/v2')
  return createCuid()
}
