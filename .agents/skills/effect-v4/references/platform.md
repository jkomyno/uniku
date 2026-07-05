# Platform Services in Effect v4

How to read configuration and environment variables, touch the file system, manipulate paths, run child processes, persist key-value data, and talk to the terminal in Effect v4. All service _interfaces_ live in core `effect` (or an `effect/unstable/*` namespace); the Node _implementations_ live in `@effect/platform-node`.

## v3 → v4: `@effect/platform` is GONE

There is **no `@effect/platform` package in v4**. Importing from it is always wrong. The module map:

| v3 import                          | v4 import                                              |
| ---------------------------------- | ------------------------------------------------------ |
| `@effect/platform/FileSystem`      | `FileSystem` from `"effect"`                           |
| `@effect/platform/Path`            | `Path` from `"effect"`                                 |
| `@effect/platform/Terminal`        | `Terminal` from `"effect"`                             |
| `@effect/platform/Error`           | `PlatformError` from `"effect"`                        |
| `@effect/platform/Command`         | `ChildProcess` from `"effect/unstable/process"`        |
| `@effect/platform/CommandExecutor` | `ChildProcessSpawner` from `"effect/unstable/process"` |
| `@effect/platform/KeyValueStore`   | `KeyValueStore` from `"effect/unstable/persistence"`   |
| `NodeContext.layer`                | `NodeServices.layer` from `"@effect/platform-node"`    |

- All platform operations are **methods on a service instance** you get by yielding the tag (`const fs = yield* FileSystem.FileSystem`). There are no module-level operation functions like `FileSystem.readFileString(...)`.
- Platform operations fail with `PlatformError`, a single tagged error whose `reason` is a `BadArgument` or a `SystemError` (with `reason._tag` like `"NotFound"`, `"PermissionDenied"`).
- `Config`/`ConfigProvider` keep their v3 module names but the APIs were rewritten (see below).

## Environment Variables & Configuration

This is the canonical Config/ConfigProvider reference in this skill; applied recipes (config inside service layers, feature flags, `Redacted` secrets) are in [schema-config-forms-ai.md](schema-config-forms-ai.md).

### Reading single values

A `Config<T>` is yieldable: inside `Effect.gen` it resolves against the current `ConfigProvider`, which defaults to environment variables (`process.env`). No layer is needed for the default env provider.

```ts
import { Config, Effect, Option, Redacted } from 'effect'

const program = Effect.gen(function* () {
  const host = yield* Config.string('HOST')
  const port = yield* Config.port('PORT').pipe(Config.withDefault(3000))
  const debug = yield* Config.boolean('DEBUG').pipe(Config.withDefault(false))
  const region = yield* Config.option(Config.string('REGION'))
  const apiKey = yield* Config.redacted('API_KEY')

  if (Option.isSome(region)) {
    yield* Effect.log(`region: ${region.value}`)
  }
  yield* Effect.log(`listening on ${host}:${port} debug=${debug}`)
  // Redacted values print "<redacted>" in logs; unwrap explicitly:
  return Redacted.value(apiKey)
})
```

- Constructors: `Config.string`, `nonEmptyString`, `number`, `finite`, `int`, `port`, `boolean`, `url`, `date`, `duration`, `logLevel`, `redacted`, `literal`/`literals` — all shortcuts for `Config.schema(...)` — plus `succeed`/`fail` for constants and forced failures.
- `Config.boolean` accepts `true/false`, `yes/no`, `on/off`, `1/0`, `y/n`.
- `Config.withDefault` and `Config.option` only apply on **missing data**. A present-but-invalid value (e.g. `PORT=abc`) still fails — this is deliberate, so typos are not silently masked by defaults. Caveat: "missing data" is judged from the schema issue tree, so for JSON-decoded values, missing keys _inside_ the document also count — see the trap below.
- `Config.orElse((error) => Config.succeed(...))` catches **all** config errors, including validation failures.
- v3 → v4: `Config.array`, `Config.hashMap`, `Config.secret` are gone. Use `Config.schema` with the `Config.Array(...)` / `Config.Record(...)` schema helpers, and `Config.redacted` for secrets.

### Grouping with Config.all and Config.nested

```ts
import { Config, Effect } from 'effect'

const DbConfig = Config.all({
  host: Config.string('HOST'),
  port: Config.port('PORT').pipe(Config.withDefault(5432)),
  password: Config.redacted('PASSWORD'),
}).pipe(Config.nested('DATABASE'))
// Reads env vars DATABASE_HOST, DATABASE_PORT, DATABASE_PASSWORD

const program = Effect.gen(function* () {
  const db = yield* DbConfig
  yield* Effect.log(`db at ${db.host}:${db.port}`)
})
```

- `Config.all` accepts a record (returns a struct) or a tuple/iterable (returns an array).
- With the env provider, `Config.nested("DATABASE")` prepends a `DATABASE_` segment; path segments are joined with `_`.
- Env lookups are **case-sensitive**: `Config.string("host").pipe(Config.nested("DATABASE"))` looks for `DATABASE_host`, not `DATABASE_HOST`.

### Schema-backed config (v4-native)

`Config.schema(codec, path?)` builds a `Config` from any `Schema.Codec` — the v4 way to validate rich, nested configuration in one shot. Use `ConfigProvider.constantCase` to bridge camelCase schema keys to `SCREAMING_SNAKE_CASE` env vars.

```ts
import { Config, ConfigProvider, Effect, Schema } from 'effect'

const AppConfig = Config.schema(
  Schema.Struct({
    host: Schema.String,
    port: Config.Port,
    debug: Config.Boolean,
    tags: Config.Array(Schema.String),
  }),
  'APP',
)

const provider = ConfigProvider.fromEnv({
  env: {
    APP_HOST: 'localhost',
    APP_PORT: '8080',
    APP_DEBUG: 'yes',
    APP_TAGS: 'queue,worker',
  },
}).pipe(ConfigProvider.constantCase)

const program = Effect.gen(function* () {
  // .parse(provider) targets a specific provider, bypassing the context
  const config = yield* AppConfig.parse(provider)
  yield* Effect.log(`${config.host}:${config.port} tags=${config.tags.join('+')}`)
})
```

- Reusable schema values for config: `Config.Port` (int 1–65535), `Config.Boolean`, `Config.LogLevel`, `Config.Array(item, { separator? })`, `Config.Record(key, value, { separator?, keyValueSeparator? })` — the latter two also decode flat strings like `"a,b,c"` and `"k1=v1,k2=v2"`.
- Schema v4 is a full rewrite; before using other Schema APIs read `repos/effect-smol/migration/schema.md`.

### Trap: `withDefault` swallows malformed JSON config values

`Config.withDefault` falls back whenever the failure consists **only of missing-data issues** (`MissingKey`, missing `AnyOf` members). After `Schema.fromJsonString`, a present-but-structurally-wrong value — a JSON document missing a required key, or a tagged union whose discriminant matches no member — can fail with those same issues, indistinguishable from "env var absent". Verify this behavior against `repos/effect-smol` and the compiler before relying on a default for structured config.

```ts
import { Config, Effect, Option, Schema } from 'effect'

const Endpoint = Schema.Struct({
  url: Schema.String,
  timeoutMillis: Schema.Number,
})

// TRAP: ENDPOINT='{"address":"..."}' (wrong keys) decodes with MissingKey
// issues inside the JSON document, so withDefault silently yields undefined
// instead of failing the misconfigured deployment.
const trap = Config.schema(Schema.fromJsonString(Endpoint), 'ENDPOINT').pipe(Config.withDefault(undefined))

// FIX: probe the variable's presence first; decode only when it exists, so
// the default covers exactly "variable absent" and any present value must
// decode or fail.
const decodeEndpoint = Schema.decodeUnknownEffect(Schema.fromJsonString(Endpoint))

const endpoint: Config.Config<typeof Endpoint.Type | undefined> = Config.option(Config.string('ENDPOINT')).pipe(
  Config.mapOrFail((raw) =>
    Option.isNone(raw)
      ? Effect.succeed(undefined)
      : decodeEndpoint(raw.value).pipe(Effect.mapError((error) => new Config.ConfigError(error))),
  ),
)
```

Flat constructors (`Config.port`, `Config.boolean`, `Config.schema` on a non-JSON codec) are unaffected: their issues sit on the env var itself, so present-but-invalid still fails.

### ConfigProvider: swapping config sources (tests, .env, directories)

`ConfigProvider.ConfigProvider` is a `Context.Reference` with default `fromEnv()` — it always has a value and can be overridden per-program, per-layer, or per-call.

```ts
import { Config, ConfigProvider, Effect, Layer } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

const port = Config.port('PORT')

// 1. Replace the provider for a whole program (tests)
const TestConfigLayer = ConfigProvider.layer(ConfigProvider.fromUnknown({ PORT: 8080 }))
const inTest = port.pipe(Effect.provide(TestConfigLayer))

// 2. Provide as a plain service for a single effect
const once = port.pipe(
  Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env: { PORT: '9090' } })),
)

// 3. Add fallback defaults UNDER the current provider (env wins)
const DefaultsLayer = ConfigProvider.layerAdd(ConfigProvider.fromUnknown({ PORT: 3000, HOST: 'localhost' }))

// 4. Load a .env file (needs FileSystem); asPrimary makes it win over env
const DotEnvLayer = ConfigProvider.layerAdd(ConfigProvider.fromDotEnv({ path: '.env' }), { asPrimary: true }).pipe(
  Layer.provide(NodeFileSystem.layer),
)
```

- Other sources: `ConfigProvider.fromDotEnvContents(string)`, `ConfigProvider.fromDir({ rootPath })` (Kubernetes-style file-per-key, needs `FileSystem` + `Path`), `ConfigProvider.make(get)` for custom stores.
- Compose providers directly with `ConfigProvider.orElse(primary, fallback)`; transform lookup paths with `ConfigProvider.nested` / `ConfigProvider.mapInput` / `ConfigProvider.constantCase`.
- v3 → v4: `ConfigProvider.fromMap(new Map(...))` is gone — use `fromUnknown({ ... })` or `fromEnv({ env: { ... } })`. `Effect.withConfigProvider` is gone — use `ConfigProvider.layer` or `Effect.provideService`.

### Handling ConfigError

Config failures are a single `ConfigError` class (tag `"ConfigError"`) wrapping either a provider `SourceError` or a Schema validation error — not the v3 `And/Or/MissingData` tree.

```ts
import { Config, Effect } from 'effect'

const withFallback = Config.string('OPTIONAL_ENDPOINT').pipe(
  Effect.catchTag('ConfigError', (error) =>
    Effect.as(Effect.log(`config failed: ${error.message}`), 'http://localhost:8080'),
  ),
)
```

## FileSystem

### Basics: read, write, exists, directories

Yield the `FileSystem.FileSystem` tag and call methods; provide `NodeFileSystem.layer`. Everything fails with `PlatformError`.

```ts
import { Effect, FileSystem } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory('out', { recursive: true })
  yield* fs.writeFileString('out/config.json', JSON.stringify({ name: 'uniku' }))

  if (yield* fs.exists('out/config.json')) {
    const content = yield* fs.readFileString('out/config.json')
    yield* Effect.log(content)
  }

  const entries = yield* fs.readDirectory('out', { recursive: true })
  const info = yield* fs.stat('out/config.json')
  yield* Effect.log(`${entries.length} entries, type=${info.type}, ${info.size} bytes`)

  yield* fs.remove('out', { recursive: true, force: true })
}).pipe(Effect.provide(NodeFileSystem.layer))
```

- Binary variants: `readFile`/`writeFile` (`Uint8Array`). Other methods: `copy`, `copyFile`, `rename`, `truncate`, `chmod`, `symlink`, `readLink`, `realPath`, `access`.
- `stat` returns `File.Info`: `info.type` is a string literal (`"File" | "Directory" | "SymbolicLink" | ...`), `info.size` is a branded bigint, timestamps are `Option<Date>`. v3 → v4 / Node trap: there is no `isFile()` method and no `mtimeMs` — compare `info.type === "File"` and `Option`-match `info.mtime`.
- v3 → v4 naming: it's `makeDirectory` (not `mkdir`), `readFileString`/`writeFileString` (not `readFileUtf8`).
- `fs.watch(path)` returns a `Stream<WatchEvent, PlatformError>` — no polling loops needed.

### Temp files and atomic writes

`makeTempDirectoryScoped` / `makeTempFileScoped` tie cleanup to a `Scope`; the temp-then-rename idiom gives crash-safe writes.

```ts
import { Effect, FileSystem } from 'effect'

const atomicWrite = Effect.fn('atomicWrite')(function* (path: string, content: string) {
  const fs = yield* FileSystem.FileSystem
  const tmp = `${path}.tmp`
  yield* fs.writeFileString(tmp, content)
  yield* fs.rename(tmp, path) // atomic on POSIX file systems
})

const withScratchSpace = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped({ prefix: 'uniku-' })
  yield* atomicWrite(`${dir}/state.json`, '{}')
  return yield* fs.readFileString(`${dir}/state.json`)
}).pipe(Effect.scoped) // directory deleted when the scope closes
```

### Streaming large files

`fs.stream(path)` is a `Stream<Uint8Array, PlatformError>`; `fs.sink(path)` is the writable counterpart. Decode and split to process line by line with constant memory.

```ts
import { Effect, FileSystem, Stream } from 'effect'

const countNonEmptyLines = Effect.fn('countNonEmptyLines')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs.stream(path).pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.filter((line) => line.trim().length > 0),
    Stream.runFold(
      () => 0,
      (count) => count + 1,
    ),
  )
})
```

- v3 → v4: `Stream.runFold` takes a lazy initial value (`() => 0`, not `0`).

### Recovering from NotFound

Branch on `error.reason._tag` — the `PlatformError` itself always has tag `"PlatformError"`.

```ts
import { Effect, FileSystem, Option } from 'effect'

const readOptional = Effect.fn('readOptional')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs.readFileString(path).pipe(
    Effect.map(Option.some),
    Effect.catch((error) => (error.reason._tag === 'NotFound' ? Effect.succeedNone : Effect.fail(error))),
  )
})
```

## Path

Cross-platform path manipulation is a service — do not import `node:path` in domain code. Provide `NodePath.layer` (host OS semantics); core `effect` also ships `Path.layer`, a pure POSIX implementation handy for tests and browsers (`NodePath` also exposes `layerPosix` / `layerWin32`).

```ts
import { Effect, Path } from 'effect'
import { NodePath } from '@effect/platform-node'

const program = Effect.gen(function* () {
  const path = yield* Path.Path

  const file = path.join('data', 'reports', '2026.json')
  const absolute = path.resolve(file)
  const parsed = path.parse(absolute) // { root, dir, base, name, ext }

  yield* Effect.log(`${parsed.name}${parsed.ext} in ${parsed.dir}`)
  yield* Effect.log(path.relative(process.cwd(), absolute))
  return path.isAbsolute(absolute)
}).pipe(Effect.provide(NodePath.layer))
```

- Also: `basename`, `dirname`, `extname`, `normalize`, `sep`, and effectful `fromFileUrl`/`toFileUrl` (fail with `BadArgument`).
- Path-traversal guard: resolve against a base directory and verify the result still starts with it before touching the file system.

## Child Processes (`effect/unstable/process`)

Build a `Command` value with `ChildProcess.make`, then execute it through the `ChildProcessSpawner` service (provided by `NodeServices.layer`, or `NodeChildProcessSpawner.layer` alone). v3 → v4: `Command.make` → `ChildProcess.make`; the pipeable executors (`Command.string`, `Command.exitCode`, `Command.lines`) are now **methods on the spawner**, not combinators on the command.

```ts
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { NodeServices } from '@effect/platform-node'

const program = Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  // Whole output as one string
  const version = yield* spawner.string(ChildProcess.make('node', ['--version']))

  // Line-oriented output as Array<string>
  const files = yield* spawner.lines(ChildProcess.make('git', ['diff', '--name-only', 'HEAD']))

  // Just the exit code (0 = success); no failure on non-zero exit
  const code = yield* spawner.exitCode(ChildProcess.make('test', ['-f', 'package.json']))

  // Pipelines: git log ... | head -n 5
  const subjects = yield* spawner.lines(
    ChildProcess.make('git', ['log', '--pretty=format:%s', '-n', '20']).pipe(
      ChildProcess.pipeTo(ChildProcess.make('head', ['-n', '5'])),
    ),
  )

  yield* Effect.log(`${version.trim()} ${files.length} ${code} ${subjects.length}`)
}).pipe(Effect.provide(NodeServices.layer))
```

- `ChildProcess.make` accepts `("cmd", ["args"], options?)` or template-literal form `` ChildProcess.make`git status` ``. Options: `cwd`, `env`, `extendEnv` (merge with `process.env`), `stdin`/`stdout`/`stderr`, `shell` (discouraged), `additionalFds`.
- Arguments are passed as an array — never interpolate user input into a shell string.
- `spawner.string`/`lines`/`streamString`/`streamLines` take `{ includeStderr: true }` to interleave stderr.

### Streaming a long-running process

`spawner.spawn` returns a `ChildProcessHandle` (requires `Scope`) with `stdout`, `stderr`, `all` streams, `exitCode`, `kill`, `pid`, `isRunning`.

```ts
import { Effect, Schema, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

class BuildError extends Schema.TaggedErrorClass<BuildError>()('BuildError', {
  exitCode: Schema.Number,
}) {}

const runBuild = Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const handle = yield* spawner.spawn(ChildProcess.make('pnpm', ['build'], { env: { CI: '1' }, extendEnv: true }))

  yield* handle.all.pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.runForEach((line) => Effect.log(`[build] ${line}`)),
  )

  const exitCode = yield* handle.exitCode
  if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
    return yield* new BuildError({ exitCode })
  }
}).pipe(Effect.scoped) // closes the scope -> terminates the process if still running
```

## KeyValueStore (`effect/unstable/persistence`)

A string/binary key-value service with pluggable backends. v3 → v4 trap: `get` returns `string | undefined`, **not** `Option<string>`.

```ts
import { Effect } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'

const program = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore

  yield* store.set('session:123', JSON.stringify({ userId: 'u1' }))

  const raw = yield* store.get('session:123') // string | undefined
  if (raw !== undefined) {
    yield* Effect.log(raw)
  }

  const exists = yield* store.has('session:123')
  const count = yield* store.size
  yield* Effect.log(`exists=${exists} count=${count}`)

  yield* store.remove('session:123')
  yield* store.clear
}).pipe(Effect.provide(KeyValueStore.layerMemory))
```

- Layers: `layerMemory` (in-process `Map`), `layerFileSystem(directory)` (file per key; requires `FileSystem` + `Path`), `layerStorage(() => localStorage)` (Web Storage), `layerSql` (SQL-backed).
- Also: `getUint8Array`/`set` with `Uint8Array`, `modify`, `isEmpty`, and `KeyValueStore.prefix(store, "app:")` for namespacing. Errors are `KeyValueStoreError`.

```ts
import { Effect, Layer, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { NodeFileSystem, NodePath } from '@effect/platform-node'

// File-system backend wired with its platform dependencies
const KvLive = KeyValueStore.layerFileSystem('./data/kv').pipe(Layer.provide([NodeFileSystem.layer, NodePath.layer]))

// Schema-validated view: values stored as JSON, decoded on read
const Session = Schema.Struct({
  userId: Schema.String,
  expiresAt: Schema.Number,
})

const sessions = Effect.gen(function* () {
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Session)
  yield* store.set('session:123', { userId: 'u1', expiresAt: 1782345600000 })
  const session = yield* store.get('session:123') // Option<{ userId, expiresAt }>
  return Option.map(session, (s) => s.userId)
}).pipe(Effect.provide(KvLive))
```

## Terminal

Minimal interactive I/O: `display(text)` writes (no implicit newline), `readLine` reads one line and fails with `QuitError` if the user cancels (Ctrl+C), `columns`/`rows` report dimensions, `readInput` gives a scoped queue of key events. Provide `NodeTerminal.layer`.

```ts
import { Effect, Terminal } from 'effect'
import { NodeTerminal } from '@effect/platform-node'

const program = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal

  yield* terminal.display('What is your name? ')
  const name = yield* terminal.readLine
  yield* terminal.display(`Hello, ${name}!\n`)
}).pipe(
  Effect.catchTag('QuitError', () => Effect.log('cancelled')),
  Effect.provide(NodeTerminal.layer),
)
```

- v3 → v4: there is no `writeLine` — append `"\n"` to `display` yourself. `readLine` is a property (an `Effect`), not a method.
- For real CLI apps (flags, subcommands, prompts) use `effect/unstable/cli` instead of hand-rolling Terminal loops.

## Wiring All Node Services at Once

`NodeServices.layer` provides `FileSystem | Path | Terminal | Stdio | Crypto | ChildProcessSpawner` in one layer — the v4 replacement for v3's `NodeContext.layer`. Use `NodeRuntime.runMain` as the process entrypoint (it installs SIGINT/SIGTERM handlers and reports errors); use `Layer.launch` for long-running daemons.

```ts
import { Effect, FileSystem, Path } from 'effect'
import { NodeRuntime, NodeServices } from '@effect/platform-node'

const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const pkg = yield* fs.readFileString(path.join(process.cwd(), 'package.json'))
  yield* Effect.log(`package.json is ${pkg.length} bytes`)
})

NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
```

- Keep libraries platform-independent: depend on the service tags (`FileSystem`, `Path`, ...) in domain code and provide `NodeServices.layer` once at the program boundary.
- HTTP client/server, sockets, and workers are _not_ in `NodeServices.layer` — they have dedicated layers (`NodeHttpClient`, `NodeHttpServer`, ...).
