import * as BunRuntime from '@effect/platform-bun/BunRuntime'
import * as BunServices from '@effect/platform-bun/BunServices'
import { Config, Console, Deferred, Effect, FileSystem, Option, Path, Schema } from 'effect'
import { ENTRYPOINTS } from './entrypoints.mjs'

const PASS_MARKER = 'UNIKU_BROWSER_SMOKE_OK'
const IMPORT_MAP_PLACEHOLDER = '__UNIKU_IMPORT_MAP__'
const PACKAGE_ROOT = `${import.meta.dir}/..`

class BrowserSmokeError extends Schema.TaggedErrorClass<BrowserSmokeError>()('BrowserSmokeError', {
  cause: Schema.Defect(),
  message: Schema.String,
}) {}

const fail = (message: string, cause: unknown = new Error(message)) => new BrowserSmokeError({ cause, message })

const runCommand = Effect.fn('BrowserSmoke.runCommand')(function* (command: ReadonlyArray<string>) {
  const result = Bun.spawnSync([...command], {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    stderr: 'pipe',
    stdout: 'pipe',
  })
  const stdout = result.stdout.toString().trim()

  if (!result.success) {
    const stderr = result.stderr.toString().trim()
    const output = [stdout, stderr].filter(Boolean).join('\n')
    return yield* fail(`Command failed: ${command.join(' ')}\n${output}`)
  }

  return stdout
})

const findBrowser = Effect.fn('BrowserSmoke.findBrowser')(function* () {
  const override = yield* Config.option(Config.string('CHROME_BIN'))
  const candidates = [
    Option.getOrUndefined(override),
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]

  for (const candidate of candidates) {
    const executable = candidate && Bun.which(candidate)
    if (executable) return executable
  }

  return yield* fail('Chrome or Chromium was not found. Set CHROME_BIN to its executable path.')
})

const makeImportMap = () => {
  const imports = Object.fromEntries(
    ENTRYPOINTS.filter(({ subpath }) => subpath !== './cuid2').map(({ mjs, name }) => [
      name,
      `/uniku/${mjs.replace(/^\.\//, '')}`,
    ]),
  )
  imports['@noble/hashes/sha3.js'] = '/noble/sha3.js'
  return { imports }
}

const loadSmokePage = Effect.fn('BrowserSmoke.loadSmokePage')(function* () {
  const template = yield* Effect.tryPromise({
    try: () => Bun.file(`${import.meta.dir}/browser-smoke.html`).text(),
    catch: (cause) => fail('Could not read the browser smoke fixture.', cause),
  })
  return template.replace(IMPORT_MAP_PLACEHOLDER, JSON.stringify(makeImportMap()))
})

const findTarball = (packOutput: string) =>
  packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith('.tgz'))

type PathService = Path.Path

const resolveAsset = (path: PathService, root: string, requestPath: string) => {
  const asset = path.resolve(root, `.${requestPath}`)
  const relative = path.relative(root, asset)
  return relative === '' || relative.startsWith('..') || path.isAbsolute(relative) ? undefined : asset
}

const serveAsset = (path: PathService, root: string, requestPath: string) => {
  const asset = resolveAsset(path, root, requestPath)
  return asset ? new Response(Bun.file(asset)) : new Response('Not found', { status: 404 })
}

const startServer = Effect.fn('BrowserSmoke.startServer')(function* (
  page: string,
  packageRoot: string,
  nobleRoot: string,
  completed: Deferred.Deferred<void, BrowserSmokeError>,
) {
  const path = yield* Path.Path

  return Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)

      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      if (request.method === 'POST' && url.pathname === '/__pass') {
        Effect.runSync(Deferred.succeed(completed, undefined))
        return new Response(null, { status: 204 })
      }
      if (request.method === 'POST' && url.pathname === '/__fail') {
        const message = await request.text()
        Effect.runSync(Deferred.fail(completed, fail(`Browser assertions failed:\n${message}`)))
        return new Response(null, { status: 204 })
      }
      if (url.pathname.startsWith('/uniku/')) {
        return serveAsset(path, packageRoot, url.pathname.slice('/uniku'.length))
      }
      if (url.pathname.startsWith('/noble/')) {
        return serveAsset(path, nobleRoot, url.pathname.slice('/noble'.length))
      }
      return new Response('Not found', { status: 404 })
    },
  })
})

const stopServer = Effect.fn('BrowserSmoke.stopServer')(function* (server: Bun.Server<unknown>) {
  yield* Effect.tryPromise({
    try: () => server.stop(true),
    catch: (cause) => fail('Could not stop the browser smoke server.', cause),
  }).pipe(Effect.ignore)
})

const spawnBrowser = (executable: string, profile: string, url: string) =>
  Bun.spawn(
    [
      executable,
      '--headless',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-sync',
      '--dump-dom',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-sandbox',
      `--user-data-dir=${profile}`,
      url,
    ],
    { stderr: 'pipe', stdout: 'pipe' },
  )

type BrowserProcess = ReturnType<typeof spawnBrowser>

const stopBrowser = Effect.fn('BrowserSmoke.stopBrowser')(function* (browser: BrowserProcess) {
  browser.kill()
  const stopped = yield* Effect.tryPromise({
    try: () => browser.exited,
    catch: (cause) => fail('Could not stop Chromium.', cause),
  }).pipe(
    Effect.timeoutOption('2 seconds'),
    Effect.catch(() => Effect.succeedNone),
  )

  if (Option.isNone(stopped)) {
    browser.kill(9)
    yield* Effect.tryPromise({
      try: () => browser.exited,
      catch: (cause) => fail('Could not force Chromium to stop.', cause),
    }).pipe(Effect.ignore)
  }
})

const failOnBrowserExit = Effect.fn('BrowserSmoke.failOnBrowserExit')(function* (browser: BrowserProcess) {
  const [exitCode, stdout, stderr] = yield* Effect.tryPromise({
    try: () => Promise.all([browser.exited, new Response(browser.stdout).text(), new Response(browser.stderr).text()]),
    catch: (cause) => fail('Could not read the Chromium process result.', cause),
  })
  return yield* fail(`Chromium exited before completing the smoke test (code ${exitCode}).\n${stdout}\n${stderr}`)
})

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const tempDir = yield* fs.makeTempDirectoryScoped({ prefix: 'uniku-browser-smoke-' })
  const packageRoot = path.join(tempDir, 'node_modules', 'uniku')

  const packOutput = yield* runCommand(['pnpm', 'pack', '--pack-destination', tempDir])
  const tarball = findTarball(packOutput)
  if (!tarball) return yield* fail(`Could not find the packed tarball in pnpm output:\n${packOutput}`)

  yield* fs.makeDirectory(packageRoot, { recursive: true })
  yield* runCommand(['tar', '-xzf', tarball, '-C', packageRoot, '--strip-components=1'])

  const nobleEntry = yield* path.fromFileUrl(new URL(import.meta.resolve('@noble/hashes/sha3.js')))
  const completed = yield* Deferred.make<void, BrowserSmokeError>()
  const page = yield* loadSmokePage()
  const server = yield* Effect.acquireRelease(
    startServer(page, packageRoot, path.dirname(nobleEntry), completed),
    stopServer,
  )

  const executable = yield* findBrowser()
  const browser = yield* Effect.acquireRelease(
    Effect.try({
      try: () =>
        spawnBrowser(executable, path.join(tempDir, 'chrome-profile'), `http://${server.hostname}:${server.port}`),
      catch: (cause) => fail('Could not start Chromium.', cause),
    }),
    stopBrowser,
  )

  yield* Deferred.await(completed).pipe(
    Effect.raceFirst(failOnBrowserExit(browser)),
    Effect.timeoutOrElse({
      duration: '10 seconds',
      orElse: () => fail('Chromium did not complete the smoke test within 10 seconds.'),
    }),
  )
  yield* Console.log(PASS_MARKER)
}).pipe(Effect.scoped)

program.pipe(
  Effect.catch((error) =>
    Effect.sync(() => {
      process.stderr.write(`Browser smoke failed: ${error.message}\n`)
      process.exitCode = 1
    }),
  ),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain,
)
