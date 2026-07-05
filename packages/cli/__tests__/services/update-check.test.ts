import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from '@effect/vitest'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import {
  CACHE_TTL_MS,
  formatNotification,
  isNewerVersion,
  makeUpdateCheckService,
  parseSemver,
  shouldNotifyUpdate,
  shouldSkipUpdateCheck,
  type UpdateInfo,
} from '@/src/services/UpdateCheckService'
import * as MockUpdateCheck from '../__utils__/services/mock-update-check'

type ConfigEntries = ReadonlyArray<readonly [string, string]>

const withConfig = <A, E, R>(effect: Effect.Effect<A, E, R>, entries: ConfigEntries = []) =>
  effect.pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env: Object.fromEntries(entries) })),
  )

const makeCacheFile = () => {
  const dir = mkdtempSync(join(tmpdir(), 'uniku-update-check-test-'))
  return { dir, cacheFile: join(dir, 'cache.json') }
}

// =============================================================================
// parseSemver
// =============================================================================

describe('parseSemver', () => {
  it('parses a simple version', () => {
    expect(parseSemver('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    })
  })

  it('parses a version with v prefix', () => {
    expect(parseSemver('v1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    })
  })

  it('parses a version with prerelease', () => {
    expect(parseSemver('1.0.0-beta.1')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: 'beta.1',
    })
  })

  it('parses a version with complex prerelease', () => {
    expect(parseSemver('0.1.0-alpha.2.rc.3')).toEqual({
      major: 0,
      minor: 1,
      patch: 0,
      prerelease: 'alpha.2.rc.3',
    })
  })

  it('returns null for invalid versions', () => {
    expect(parseSemver('not-a-version')).toBeNull()
    expect(parseSemver('')).toBeNull()
    expect(parseSemver('1.2')).toBeNull()
    expect(parseSemver('1')).toBeNull()
  })

  it('rejects prereleases containing terminal escape characters', () => {
    expect(parseSemver('9.9.9-\x1b[31mpwned')).toBeNull()
  })
})

// =============================================================================
// isNewerVersion
// =============================================================================

describe('isNewerVersion', () => {
  it('returns true when latest has higher major', () => {
    expect(isNewerVersion('2.0.0', '1.0.0')).toBe(true)
  })

  it('returns true when latest has higher minor', () => {
    expect(isNewerVersion('1.1.0', '1.0.0')).toBe(true)
  })

  it('returns true when latest has higher patch', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true)
  })

  it('returns false when versions are equal', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
  })

  it('returns false when current is newer', () => {
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(false)
  })

  it('returns true when stable beats prerelease of same version', () => {
    // 1.0.0 > 1.0.0-beta.1
    expect(isNewerVersion('1.0.0', '1.0.0-beta.1')).toBe(true)
  })

  it('returns false when prerelease vs stable of same version', () => {
    // 1.0.0-beta.1 < 1.0.0
    expect(isNewerVersion('1.0.0-beta.1', '1.0.0')).toBe(false)
  })

  it('returns false when current prerelease is higher version', () => {
    // User on 1.0.0-beta.1, latest stable is 0.9.0 — user is ahead
    expect(isNewerVersion('0.9.0', '1.0.0-beta.1')).toBe(false)
  })

  it('returns true when latest stable is higher than current prerelease', () => {
    // User on 0.9.0-beta.1, latest stable is 1.0.0
    expect(isNewerVersion('1.0.0', '0.9.0-beta.1')).toBe(true)
  })

  it('returns false for invalid version strings', () => {
    expect(isNewerVersion('invalid', '1.0.0')).toBe(false)
    expect(isNewerVersion('1.0.0', 'invalid')).toBe(false)
  })

  it('handles v prefix', () => {
    expect(isNewerVersion('v2.0.0', 'v1.0.0')).toBe(true)
  })
})

// =============================================================================
// formatNotification
// =============================================================================

describe('formatNotification', () => {
  const baseInfo: UpdateInfo = {
    currentVersion: '0.0.11',
    latestVersion: '1.0.0',
    isStandaloneBinary: false,
  }

  describe('with NO_COLOR', () => {
    it.effect('formats notification for npm install', () =>
      Effect.gen(function* () {
        const result = yield* withConfig(formatNotification(baseInfo), [['NO_COLOR', '1']])
        expect(result).toContain('Update available: 0.0.11 → 1.0.0')
        expect(result).toContain('npm install -g @uniku/cli')
        expect(result).toContain('NO_UPDATE_NOTIFIER=1')
        // Should NOT contain ANSI codes
        expect(result).not.toContain('\x1b[')
      }),
    )

    it.effect('formats notification for standalone binary', () =>
      Effect.gen(function* () {
        const result = yield* withConfig(formatNotification({ ...baseInfo, isStandaloneBinary: true }), [
          ['NO_COLOR', '1'],
        ])
        expect(result).toContain('Update available: 0.0.11 → 1.0.0')
        expect(result).toContain('https://github.com/jkomyno/uniku/releases')
        expect(result).not.toContain('npm install')
      }),
    )
  })

  describe('without NO_COLOR', () => {
    it.effect('includes ANSI codes for npm install', () =>
      Effect.gen(function* () {
        const result = yield* withConfig(formatNotification(baseInfo))
        expect(result).toContain('\x1b[')
        expect(result).toContain('0.0.11')
        expect(result).toContain('1.0.0')
        expect(result).toContain('npm install -g @uniku/cli')
      }),
    )

    it.effect('includes ANSI codes for standalone binary', () =>
      Effect.gen(function* () {
        const result = yield* withConfig(formatNotification({ ...baseInfo, isStandaloneBinary: true }))
        expect(result).toContain('\x1b[')
        expect(result).toContain('https://github.com/jkomyno/uniku/releases')
      }),
    )
  })
})

// =============================================================================
// shouldSkipUpdateCheck
// =============================================================================

describe('shouldSkipUpdateCheck', () => {
  it.effect.each([
    { name: 'NO_UPDATE_NOTIFIER', entries: [['NO_UPDATE_NOTIFIER', '1']], isTty: true },
    { name: 'CI', entries: [['CI', 'true']], isTty: true },
    { name: 'CONTINUOUS_INTEGRATION', entries: [['CONTINUOUS_INTEGRATION', 'true']], isTty: true },
    { name: 'NODE_ENV=test', entries: [['NODE_ENV', 'test']], isTty: true },
    { name: 'non-TTY stderr', entries: [], isTty: false },
  ] satisfies ReadonlyArray<{ readonly name: string; readonly entries: ConfigEntries; readonly isTty: boolean }>)(
    'returns true for $name',
    ({ entries, isTty }) =>
      Effect.gen(function* () {
        const result = yield* withConfig(shouldSkipUpdateCheck(isTty), entries)
        expect(result).toBe(true)
      }),
  )

  it.effect('returns false when no skip condition is active', () =>
    Effect.gen(function* () {
      const result = yield* withConfig(shouldSkipUpdateCheck(true))
      expect(result).toBe(false)
    }),
  )
})

// =============================================================================
// shouldNotifyUpdate
// =============================================================================

describe('shouldNotifyUpdate', () => {
  const info: UpdateInfo = {
    currentVersion: '0.0.11',
    latestVersion: '1.0.0',
    isStandaloneBinary: false,
  }

  it('returns true only when an update exists and JSON output is not active', () => {
    expect(shouldNotifyUpdate(['node', 'uniku', 'uuid'], Option.some(info))).toBe(true)
    expect(shouldNotifyUpdate(['node', 'uniku', 'uuid', '--json'], Option.some(info))).toBe(false)
    expect(shouldNotifyUpdate(['node', 'uniku', 'uuid'], Option.none())).toBe(false)
  })
})

// =============================================================================
// UpdateCheckService
// =============================================================================

describe('UpdateCheckService', () => {
  const cacheDirs: string[] = []

  afterEach(() => {
    for (const dir of cacheDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it.effect('uses a fresh cache entry to render a notification without fetching', () =>
    Effect.gen(function* () {
      const { dir, cacheFile } = makeCacheFile()
      cacheDirs.push(dir)
      writeFileSync(cacheFile, JSON.stringify({ latestVersion: '1.2.3', checkedAt: 10_000 }))

      const fetchLatestVersion = vi.fn(() => Effect.succeed('9.9.9'))
      const stderr: string[] = []
      const service = makeUpdateCheckService({
        cacheFile,
        fetchLatestVersion,
        isStandaloneBinary: () => false,
        isStderrTTY: () => true,
        now: () => 10_100,
        writeStderr: (message) => stderr.push(message),
      })

      const result = yield* withConfig(service.check('1.0.0'))

      expect(fetchLatestVersion).not.toHaveBeenCalled()
      expect(Option.isSome(result)).toBe(true)

      if (Option.isSome(result)) {
        expect(result.value).toEqual({
          currentVersion: '1.0.0',
          latestVersion: '1.2.3',
          isStandaloneBinary: false,
        })
        yield* withConfig(service.notify(result.value))
      }

      expect(stderr.join('')).toContain('1.2.3')
    }),
  )

  it.effect('fetches when the cache is stale and writes the successful version', () =>
    Effect.gen(function* () {
      const { dir, cacheFile } = makeCacheFile()
      cacheDirs.push(dir)
      const now = 20_000 + CACHE_TTL_MS
      writeFileSync(cacheFile, JSON.stringify({ latestVersion: '1.0.0', checkedAt: now - CACHE_TTL_MS - 1 }))

      const fetchLatestVersion = vi.fn(() => Effect.succeed('1.3.0'))
      const service = makeUpdateCheckService({
        cacheFile,
        fetchLatestVersion,
        isStandaloneBinary: () => false,
        isStderrTTY: () => true,
        now: () => now,
      })

      const result = yield* withConfig(service.check('1.0.0'))

      expect(fetchLatestVersion).toHaveBeenCalledTimes(1)
      expect(Option.isSome(result)).toBe(true)
      expect(JSON.parse(readFileSync(cacheFile, 'utf-8'))).toEqual({ latestVersion: '1.3.0', checkedAt: now })
    }),
  )

  it.effect('swallows fetch failures and negative-caches them for the TTL', () =>
    Effect.gen(function* () {
      const { dir, cacheFile } = makeCacheFile()
      cacheDirs.push(dir)
      let now = 30_000

      const fetchLatestVersion = vi.fn(() => Effect.succeed(null))
      const service = makeUpdateCheckService({
        cacheFile,
        fetchLatestVersion,
        isStderrTTY: () => true,
        now: () => now,
      })

      const first = yield* withConfig(service.check('1.0.0'))
      now += 100
      const second = yield* withConfig(service.check('1.0.0'))

      expect(Option.isNone(first)).toBe(true)
      expect(Option.isNone(second)).toBe(true)
      expect(fetchLatestVersion).toHaveBeenCalledTimes(1)
      expect(JSON.parse(readFileSync(cacheFile, 'utf-8'))).toEqual({ checkedAt: 30_000 })
    }),
  )

  it.effect('keeps the mock UpdateCheckService test layer injectable', () =>
    Effect.gen(function* () {
      const { service, access } = yield* MockUpdateCheck.make
      const info: UpdateInfo = {
        currentVersion: '0.0.11',
        latestVersion: '1.0.0',
        isStandaloneBinary: false,
      }

      yield* service.notify(info)

      const notifications = yield* access.getNotifications()
      expect(notifications).toEqual([info])
    }),
  )
})
