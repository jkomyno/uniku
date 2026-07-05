import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir, userInfo } from 'node:os'
import { dirname, join } from 'node:path'
import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

// ── Types ────────────────────────────────────────────────────────────

export interface UpdateInfo {
  readonly currentVersion: string
  readonly latestVersion: string
  readonly isStandaloneBinary: boolean
}

interface UpdateCache {
  readonly latestVersion?: string
  readonly checkedAt: number
}

interface UpdateCheckServiceOptions {
  readonly cacheFile?: string
  readonly fetchLatestVersion?: (currentVersion: string) => Effect.Effect<string | null>
  readonly isStandaloneBinary?: () => boolean
  readonly isStderrTTY?: () => boolean
  readonly now?: () => number
  readonly writeStderr?: (message: string) => void
}

// ── Service ──────────────────────────────────────────────────────────

export class UpdateCheckService extends Context.Service<
  UpdateCheckService,
  {
    /** Check for available updates. Returns Some(info) if update available, None otherwise. */
    readonly check: (currentVersion: string) => Effect.Effect<Option.Option<UpdateInfo>>
    /** Print the update notification to stderr. */
    readonly notify: (info: UpdateInfo) => Effect.Effect<void>
  }
>()('uniku/cli/UpdateCheckService') {
  static readonly layer = Layer.sync(UpdateCheckService, () => makeUpdateCheckService())
}

// ── Constants ────────────────────────────────────────────────────────

const PACKAGE_NAME = '@uniku/cli'
const REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FETCH_TIMEOUT_MS = 5_000

function cacheUserSegment(): string | null {
  const getuid = (process as { getuid?: () => number }).getuid
  if (typeof getuid === 'function') {
    return `uid-${getuid()}`
  }

  try {
    const segment = userInfo().username.replace(/[^0-9A-Za-z._-]/g, '_')
    return segment ? `user-${segment}` : null
  } catch {
    return null
  }
}

function defaultCacheFile(): string {
  const userSegment = cacheUserSegment()
  const filename = userSegment ? `uniku-update-check-${userSegment}.json` : 'uniku-update-check.json'
  return join(tmpdir(), filename)
}

export const DEFAULT_CACHE_FILE = defaultCacheFile()

// ── Version comparison ───────────────────────────────────────────────

/**
 * Parse a semver version string into its components.
 * Returns null if the string is not a valid semver.
 */
export function parseSemver(version: string) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

/**
 * Returns true if `latest` is newer than `current`.
 *
 * Handles pre-release correctly:
 * - 1.0.0 > 1.0.0-beta.1 (stable is newer than pre-release of same version)
 * - 1.0.0-beta.1 > 0.9.0 (pre-release of higher version is newer)
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const l = parseSemver(latest)
  const c = parseSemver(current)
  if (!l || !c) return false

  if (l.major !== c.major) return l.major > c.major
  if (l.minor !== c.minor) return l.minor > c.minor
  if (l.patch !== c.patch) return l.patch > c.patch

  // Same major.minor.patch — stable (no prerelease) beats pre-release
  if (l.prerelease === null && c.prerelease !== null) return true
  if (l.prerelease !== null && c.prerelease === null) return false

  return false
}

// ── Skip conditions ──────────────────────────────────────────────────

function optionalConfigString(name: string): Effect.Effect<Option.Option<string>> {
  return Config.option(Config.string(name)).pipe(Effect.catch(() => Effect.succeed(Option.none())))
}

function isTruthyConfig(value: Option.Option<string>): boolean {
  return Option.isSome(value) && value.value.length > 0
}

const updateCheckConfig = Effect.all({
  noUpdateNotifier: optionalConfigString('NO_UPDATE_NOTIFIER'),
  ci: optionalConfigString('CI'),
  continuousIntegration: optionalConfigString('CONTINUOUS_INTEGRATION'),
  nodeEnv: optionalConfigString('NODE_ENV'),
})

export function shouldSkipUpdateCheck(isStderrTTY = process.stderr.isTTY): Effect.Effect<boolean> {
  return updateCheckConfig.pipe(
    Effect.map(
      (config) =>
        isTruthyConfig(config.noUpdateNotifier) ||
        isTruthyConfig(config.ci) ||
        isTruthyConfig(config.continuousIntegration) ||
        (Option.isSome(config.nodeEnv) && config.nodeEnv.value === 'test') ||
        !isStderrTTY,
    ),
  )
}

// ── Notification formatting ──────────────────────────────────────────

function formatNotificationWithColor(info: UpdateInfo, noColor: boolean): string {
  if (noColor) {
    const updateCmd = info.isStandaloneBinary
      ? `Download at https://github.com/jkomyno/uniku/releases`
      : `Run \`npm install -g ${PACKAGE_NAME}\` to update`
    return [
      '',
      `  Update available: ${info.currentVersion} → ${info.latestVersion}`,
      `  ${updateCmd}`,
      `  Set NO_UPDATE_NOTIFIER=1 to disable`,
      '',
    ].join('\n')
  }

  const dim = '\x1b[2m'
  const cyan = '\x1b[36m'
  const boldCyan = '\x1b[1;36m'
  const reset = '\x1b[0m'

  const updateCmd = info.isStandaloneBinary
    ? `Download at ${cyan}https://github.com/jkomyno/uniku/releases${reset}`
    : `Run ${cyan}\`npm install -g ${PACKAGE_NAME}\`${reset} to update`

  return [
    '',
    `  ${dim}Update available:${reset} ${dim}${info.currentVersion}${reset} ${dim}→${reset} ${boldCyan}${info.latestVersion}${reset}`,
    `  ${updateCmd}`,
    `  ${dim}Set NO_UPDATE_NOTIFIER=1 to disable${reset}`,
    '',
  ].join('\n')
}

export function formatNotification(info: UpdateInfo): Effect.Effect<string> {
  return optionalConfigString('NO_COLOR').pipe(
    Effect.map((noColor) => formatNotificationWithColor(info, isTruthyConfig(noColor))),
  )
}

export function shouldNotifyUpdate(
  args: readonly string[],
  result: Option.Option<UpdateInfo>,
): result is Option.Some<UpdateInfo> {
  return Option.isSome(result) && !args.includes('--json')
}

// ── Cache helpers (plain Node.js — maximally resilient) ──────────────

function readCache(cacheFile: string): UpdateCache | null {
  try {
    const content = readFileSync(cacheFile, 'utf-8')
    const parsed = JSON.parse(content) as unknown

    if (typeof parsed !== 'object' || parsed === null) return null
    const cache = parsed as { checkedAt?: unknown; latestVersion?: unknown }
    if (typeof cache.checkedAt !== 'number' || !Number.isFinite(cache.checkedAt)) return null
    if (cache.latestVersion !== undefined && typeof cache.latestVersion !== 'string') return null

    return cache.latestVersion === undefined
      ? { checkedAt: cache.checkedAt }
      : { latestVersion: cache.latestVersion, checkedAt: cache.checkedAt }
  } catch {
    return null
  }
}

function writeCache(cache: UpdateCache, cacheFile: string): void {
  try {
    const dir = dirname(cacheFile)
    mkdirSync(dir, { recursive: true })
    const tmpPath = `${cacheFile}.tmp`
    writeFileSync(tmpPath, JSON.stringify(cache))
    renameSync(tmpPath, cacheFile)
  } catch {
    // Silently ignore write errors
  }
}

// ── Registry fetch ───────────────────────────────────────────────────

function fetchLatestVersion(currentVersion: string): Effect.Effect<string | null> {
  return Effect.tryPromise({
    try: (signal) =>
      fetch(REGISTRY_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `${PACKAGE_NAME}/${currentVersion}`,
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { version?: string }
        if (!data.version) throw new Error('Missing version field')
        return data.version
      }),
    catch: () => new Error('fetch failed'),
  }).pipe(Effect.catch(() => Effect.succeed(null)))
}

// ── Standalone binary detection ──────────────────────────────────────

declare const __STANDALONE_BINARY__: boolean | undefined

function isStandaloneBinary(): boolean {
  try {
    return typeof __STANDALONE_BINARY__ !== 'undefined' && __STANDALONE_BINARY__ === true
  } catch {
    return false
  }
}

// ── Live implementation ──────────────────────────────────────────────

export function makeUpdateCheckService(options: UpdateCheckServiceOptions = {}) {
  const cacheFile = options.cacheFile ?? DEFAULT_CACHE_FILE
  const fetchVersion = options.fetchLatestVersion ?? fetchLatestVersion
  const getNow = options.now ?? Date.now
  const detectStandaloneBinary = options.isStandaloneBinary ?? isStandaloneBinary
  const isStderrTTY = options.isStderrTTY ?? (() => process.stderr.isTTY)
  const writeStderr = options.writeStderr ?? ((message: string) => process.stderr.write(message))

  return UpdateCheckService.of({
    check: Effect.fn('UpdateCheckService.check')(
      function* (currentVersion: string) {
        if (yield* shouldSkipUpdateCheck(isStderrTTY())) {
          return Option.none<UpdateInfo>()
        }

        const cached = readCache(cacheFile)
        const now = getNow()

        // Cache is fresh — use cached result
        if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
          if (cached.latestVersion && isNewerVersion(cached.latestVersion, currentVersion)) {
            return Option.some<UpdateInfo>({
              currentVersion,
              latestVersion: cached.latestVersion,
              isStandaloneBinary: detectStandaloneBinary(),
            })
          }
          return Option.none<UpdateInfo>()
        }

        // Cache is stale or missing — fetch from registry
        const latestVersion = yield* fetchVersion(currentVersion)

        if (latestVersion === null) {
          writeCache({ checkedAt: now }, cacheFile)
          return Option.none<UpdateInfo>()
        }

        writeCache({ latestVersion, checkedAt: now }, cacheFile)

        if (isNewerVersion(latestVersion, currentVersion)) {
          return Option.some<UpdateInfo>({
            currentVersion,
            latestVersion,
            isStandaloneBinary: detectStandaloneBinary(),
          })
        }

        return Option.none<UpdateInfo>()
      },
      Effect.catch(() => Effect.succeed(Option.none<UpdateInfo>())),
    ),

    notify: Effect.fn('UpdateCheckService.notify')(function* (info: UpdateInfo) {
      const message = yield* formatNotification(info)
      yield* Effect.sync(() => {
        writeStderr(message)
      })
    }),
  })
}
