import { createMiddleware, getDefaultSerovalPlugins } from '@tanstack/react-start'
import { fromJSON } from 'seroval'

// `@tanstack/start-static-server-functions` writes its build-time cache to
// `<client output>/__tsr/staticServerFnCache/<sha1>.json`, but its client
// middleware fetches that path root-absolute, ignoring Vite's `base`. On
// GitHub Pages the site lives under `/uniku/`, so the fetch 404s and every
// client-side navigation into a docs route hits the error boundary.
//
// This middleware mirrors the package's client lookup (same filename hashing)
// with the URL resolved against `import.meta.env.BASE_URL`, and short-circuits
// before the package's client code runs. The package's server middleware still
// writes the cache during prerender, so it must stay after this one in the
// middleware chain.

async function sha1Hash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function jsonToFilenameSafeString(json: unknown): string {
  const sortedKeysReplacer = (_key: string, value: unknown): unknown =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value)
          .sort()
          .reduce<Record<string, unknown>>((acc, curr) => {
            acc[curr] = (value as Record<string, unknown>)[curr]
            return acc
          }, {})
      : value

  return JSON.stringify(json ?? '', sortedKeysReplacer)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
}

export const baseAwareStaticClientMiddleware = createMiddleware({ type: 'function' }).client(async (ctx) => {
  if (import.meta.env.PROD && typeof document !== 'undefined') {
    const hash = jsonToFilenameSafeString(ctx.data)
    const filename = await sha1Hash(`${ctx.serverFnMeta.id}__${hash}`)
    const url = `${import.meta.env.BASE_URL}__tsr/staticServerFnCache/${filename}.json`

    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      throw new Error(`failed to fetch static server function cache from ${url}: ${res.status}`)
    }
    const response = fromJSON(await res.json(), { plugins: getDefaultSerovalPlugins() }) as {
      result: unknown
      context?: Record<string, unknown>
    }

    return {
      result: response.result,
      context: {
        ...((ctx.context ?? {}) as Record<string, unknown>),
        ...(response.context ?? {}),
      },
    } as never
  }

  return ctx.next()
})
