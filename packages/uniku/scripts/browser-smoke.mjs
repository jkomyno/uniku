import { spawn, spawnSync } from 'node:child_process'
import { accessSync, constants, createReadStream, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENTRYPOINTS } from './entrypoints.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(scriptDir)
const passMarker = 'UNIKU_BROWSER_SMOKE_OK'

const fail = (message) => {
  throw new Error(message)
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    ...options,
  })

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n')
    fail(`Command failed: ${command} ${args.join(' ')}\n${details}`)
  }

  return result.stdout.trim()
}

const commandPath = (command) => {
  const result = spawnSync('which', [command], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
}

const browserPath = () => {
  const candidates = [
    process.env.CHROME_BIN,
    commandPath('google-chrome-stable'),
    commandPath('google-chrome'),
    commandPath('chromium'),
    commandPath('chromium-browser'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // Try the next known executable.
    }
  }

  fail('Chrome or Chromium was not found. Set CHROME_BIN to its executable path.')
}

const contentType = (path) => {
  switch (extname(path)) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

const moduleRoot = (specifier) => {
  const resolvedPath = fileURLToPath(import.meta.resolve(specifier))
  return resolvedPath.slice(0, resolvedPath.lastIndexOf('/@noble/hashes/') + '/@noble/hashes'.length)
}

const importMapFor = (packedPackageRoot) => {
  const imports = Object.fromEntries(
    ENTRYPOINTS.filter((entry) => entry.subpath !== './cuid2').map((entry) => [
      entry.name,
      `/uniku/${relative(packedPackageRoot, join(packedPackageRoot, entry.mjs))}`,
    ]),
  )
  imports['@noble/hashes/sha3.js'] = '/noble/sha3.js'
  return { imports }
}

const smokePage = (importMap) => `<!doctype html>
<meta charset="utf-8">
<title>uniku browser smoke</title>
<main id="status">UNIKU_BROWSER_SMOKE_PENDING</main>
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
  import { uuidv4 } from 'uniku/uuid/v4'
  import { uuidv7 } from 'uniku/uuid/v7'
  import { ulid } from 'uniku/ulid'
  import { typeid } from 'uniku/typeid'
  import { cuidv2 } from 'uniku/cuid/v2'
  import { nanoid } from 'uniku/nanoid'
  import { ksuid } from 'uniku/ksuid'
  import { objectid } from 'uniku/objectid'
  import { tsid } from 'uniku/tsid'
  import { InvalidInputError } from 'uniku/errors'
  import { ID_GENERATORS } from 'uniku/generators'

  const status = document.querySelector('#status')

  try {
    const values = [uuidv4(), uuidv7(), ulid(), typeid('smoke'), cuidv2(), nanoid(), ksuid(), objectid()]
    if (!values.every((value) => typeof value === 'string' && value.length > 0)) {
      throw new Error('A string generator returned an invalid value.')
    }
    if (typeof tsid() !== 'bigint') {
      throw new Error('TSID did not return a bigint.')
    }
    if (!(new InvalidInputError('SMOKE', 'smoke') instanceof Error)) {
      throw new Error('The public error class is not an Error.')
    }
    if (!ID_GENERATORS.includes('uuid') || !ID_GENERATORS.includes('tsid')) {
      throw new Error('The generator manifest is incomplete.')
    }

    status.textContent = ['UNIKU', 'BROWSER', 'SMOKE', 'OK'].join('_')
    await fetch('/__pass', { method: 'POST' })
  } catch (error) {
    status.textContent = 'UNIKU_BROWSER_SMOKE_FAILED: ' + (error?.stack ?? error)
  }
</script>`

const serveFile = (response, root, requestPath) => {
  const filePath = resolve(root, `.${requestPath}`)
  const relativePath = relative(root, filePath)

  if (relativePath.startsWith('..') || relativePath === '') {
    response.writeHead(404).end()
    return
  }

  response.writeHead(200, { 'content-type': contentType(filePath) })
  const stream = createReadStream(filePath)
  stream.on('error', () => response.destroy())
  stream.pipe(response)
}

const launchBrowser = (browser, profileDir, url) => {
  const child = spawn(
    browser,
    [
      '--headless',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-sandbox',
      `--user-data-dir=${profileDir}`,
      url,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk) => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk
  })

  const closed = new Promise((resolvePromise, reject) => {
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
  })

  return { child, closed }
}

const tempDir = mkdtempSync(join(tmpdir(), 'uniku-browser-smoke-'))
let server
let markPassed
const passed = new Promise((resolvePromise) => {
  markPassed = resolvePromise
})

try {
  const packOutput = run('pnpm', ['pack', '--pack-destination', tempDir])
  const tarballPath = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith('.tgz'))

  if (!tarballPath) {
    fail(`Could not find packed tarball path in pnpm pack output:\n${packOutput}`)
  }

  const packedPackageRoot = join(tempDir, 'node_modules', 'uniku')
  mkdirSync(packedPackageRoot, { recursive: true })
  run('tar', ['-xzf', tarballPath, '-C', packedPackageRoot, '--strip-components=1'])

  const nobleRoot = moduleRoot('@noble/hashes/sha3.js')
  const page = smokePage(importMapFor(packedPackageRoot))

  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname

    if (pathname === '/' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page)
    } else if (pathname === '/__pass' && request.method === 'POST') {
      response.writeHead(204).end()
      markPassed()
    } else if (pathname.startsWith('/uniku/')) {
      serveFile(response, packedPackageRoot, pathname.slice('/uniku'.length))
    } else if (pathname.startsWith('/noble/')) {
      serveFile(response, nobleRoot, pathname.slice('/noble'.length))
    } else {
      response.writeHead(404).end()
    }
  })

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    fail('Could not determine the browser smoke server address.')
  }

  const browser = launchBrowser(
    browserPath(),
    join(tempDir, 'chrome-profile'),
    `http://127.0.0.1:${address.port}`,
  )
  const timeout = setTimeout(() => browser.child.kill('SIGKILL'), 10_000)
  const result = await Promise.race([
    passed.then(() => ({ passed: true })),
    browser.closed.then((details) => ({ passed: false, details })),
  ])
  clearTimeout(timeout)

  if (!result.passed) {
    fail(
      `Browser smoke failed with exit code ${result.details.code}.\n${result.details.stdout}\n${result.details.stderr}`,
    )
  }

  browser.child.kill()
  const forceKill = setTimeout(() => browser.child.kill('SIGKILL'), 2_000)
  await browser.closed
  clearTimeout(forceKill)
  console.log(passMarker)
} finally {
  await new Promise((resolvePromise) => (server ? server.close(resolvePromise) : resolvePromise()))
  rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
