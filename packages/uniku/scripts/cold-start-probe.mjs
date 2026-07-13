import { performance } from 'node:perf_hooks'

import { COLD_START_ENTRYPOINTS } from './cold-start-entrypoints.mjs'

const entrypoint = process.argv[2]
const entry = COLD_START_ENTRYPOINTS.find((candidate) => candidate.entrypoint === entrypoint)
if (!entry) {
  throw new Error(`Unknown generator entry point: ${entrypoint}`)
}

const started = performance.now()
const module = await import(new URL(`../${entry.mjs.slice(2)}`, import.meta.url))
entry.invoke(module)

process.stdout.write(`${JSON.stringify({ importAndFirstIdMs: performance.now() - started })}\n`)
