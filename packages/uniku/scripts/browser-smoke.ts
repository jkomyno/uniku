import * as BunRuntime from '@effect/platform-bun/BunRuntime'
import * as BunServices from '@effect/platform-bun/BunServices'
import { Config, Console, Deferred, Effect, FileSystem, Option, Path, Schema } from 'effect'

const PASS_MARKER = 'UNIKU_BROWSER_SMOKE_OK'
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

const findTarball = (packOutput: string) =>
  packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith('.tgz'))

const bundleFixture = Effect.fn('BrowserSmoke.bundleFixture')(function* (entrypoint: string) {
  const result = yield* Effect.tryPromise({
    try: () =>
      Bun.build({
        allowUnresolved: [],
        entrypoints: [entrypoint],
        format: 'esm',
        packages: 'bundle',
        target: 'browser',
      }),
    catch: (cause) => fail('Could not bundle the browser smoke fixture.', cause),
  })

  if (!result.success) {
    const diagnostics = result.logs.map(({ message }) => message).join('\n')
    return yield* fail(`Could not bundle the packed uniku package:\n${diagnostics}`, result.logs)
  }

  const bundle = result.outputs[0]
  if (!bundle) return yield* fail('Bun produced no browser smoke bundle.')
  return bundle
})

const startServer = (
  page: Bun.BunFile,
  bundle: Bun.BuildArtifact,
  completed: Deferred.Deferred<void, BrowserSmokeError>,
) =>
  Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url)

      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(page)
      }
      if (request.method === 'GET' && url.pathname === '/browser-smoke.js') {
        return new Response(bundle, { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
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
      return new Response('Not found', { status: 404 })
    },
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
  const nodeModules = path.join(tempDir, 'node_modules')
  const packageRoot = path.join(nodeModules, 'uniku')

  const packOutput = yield* runCommand(['pnpm', 'pack', '--pack-destination', tempDir])
  const tarball = findTarball(packOutput)
  if (!tarball) return yield* fail(`Could not find the packed tarball in pnpm output:\n${packOutput}`)

  yield* fs.makeDirectory(packageRoot, { recursive: true })
  yield* runCommand(['tar', '-xzf', tarball, '-C', packageRoot, '--strip-components=1'])

  const nobleEntry = yield* path.fromFileUrl(new URL(import.meta.resolve('@noble/hashes/sha3.js')))
  const nobleModules = path.join(nodeModules, '@noble')
  yield* fs.makeDirectory(nobleModules, { recursive: true })
  yield* fs.symlink(path.dirname(nobleEntry), path.join(nobleModules, 'hashes'))

  const fixture = path.join(tempDir, 'browser-smoke.fixture.ts')
  yield* fs.copyFile(path.join(import.meta.dir, 'browser-smoke.fixture.ts'), fixture)
  const bundle = yield* bundleFixture(fixture)

  const completed = yield* Deferred.make<void, BrowserSmokeError>()
  const server = yield* Effect.acquireRelease(
    Effect.try({
      try: () => startServer(Bun.file(path.join(import.meta.dir, 'browser-smoke.html')), bundle, completed),
      catch: (cause) => fail('Could not start the browser smoke server.', cause),
    }),
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
      duration: '30 seconds',
      orElse: () => fail('Chromium did not complete the smoke test within 30 seconds.'),
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
