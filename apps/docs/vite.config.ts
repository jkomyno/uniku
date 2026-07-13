import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.DOCS_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' ? '/uniku/' : '/'),
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          crawlLinks: true,
          enabled: true,
        },
      },
      pages: [{ path: '/docs' }, { path: '/api/search' }],
    }),
    react(),
  ],
  resolve: {
    noExternal: ['fumadocs-core', 'fumadocs-ui'],
    tsconfigPaths: true,
  },
})
