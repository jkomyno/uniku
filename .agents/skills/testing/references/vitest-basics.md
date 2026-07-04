# Vitest Basics

Open this when writing regular Vitest tests, setup/teardown, spies, globals, or module-isolation fixtures.

Use regular Vitest tests for pure synchronous code and `@effect/vitest` for Effect-returning tests. Keep setup local to the file unless multiple files need the same fixture.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('normalizeName', () => {
  it('trims and lowercases input', () => {
    expect(' Ada '.trim().toLowerCase()).toBe('ada')
  })
})
```

Prefer `vi.spyOn` over broad `vi.mock` when a direct dependency can be observed or replaced narrowly.

```ts
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

it('uses a boundary dependency', () => {
  const client = {
    fetchUser: (_id: string): Promise<{ readonly name: string }> => Promise.resolve({ name: 'Ada' }),
  }
  const fetchUser = vi.spyOn(client, 'fetchUser').mockResolvedValue({ name: 'Lin' })

  expect(fetchUser).not.toHaveBeenCalled()
})
```

Use `vi.stubGlobal` for browser or runtime globals. If module state is polluted, use `vi.resetModules()` and re-import inside the test that needs isolation.
