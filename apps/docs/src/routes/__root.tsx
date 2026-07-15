import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import appCss from '@/styles/app.css?url'
import DocsSearch from '@/components/search'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [{ href: appCss, rel: 'stylesheet' }],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      {
        content:
          "Ten type-safe ID strategies behind one consistent API. In uniku's current CI benchmark, every generator beats its dedicated npm alternative.",
        name: 'description',
      },
      { title: 'uniku: ten type-safe ID strategies, each benchmarked fastest' },
    ],
  }),
})

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider search={{ SearchDialog: DocsSearch }}>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
