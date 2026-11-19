import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import DocsSearch from '@/components/search'
import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [{ href: appCss, rel: 'stylesheet' }],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      {
        content:
          'Eleven type-safe ID strategies behind one consistent API, with independent entry points and published performance measurements.',
        name: 'description',
      },
      { title: 'uniku: eleven type-safe ID strategies' },
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
