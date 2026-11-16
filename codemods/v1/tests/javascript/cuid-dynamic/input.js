export async function create() {
  const { cuid2 } = await import('uniku/cuid2')
  const direct = (await import("uniku/cuid2")).cuid2()
  return [cuid2(), direct]
}
