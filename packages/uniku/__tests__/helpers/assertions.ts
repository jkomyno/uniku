export function expectValidTypeGuard<T>(value: unknown, isValid: (value: unknown) => value is T): asserts value is T {
  expect(isValid(value)).toBe(true)
}
