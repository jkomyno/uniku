export async function create() {
  const { cuidv2 } = await import('uniku/cuid/v2')
  const direct = (await import("uniku/cuid/v2")).cuidv2()
  return [cuidv2(), direct]
}
