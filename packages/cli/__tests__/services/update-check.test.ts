import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatNotification, isNewerVersion, parseSemver, type UpdateInfo } from '@/src/services/UpdateCheckService'

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
    const origNoColor = process.env.NO_COLOR

    beforeEach(() => {
      process.env.NO_COLOR = '1'
    })

    afterEach(() => {
      if (origNoColor === undefined) {
        delete process.env.NO_COLOR
      } else {
        process.env.NO_COLOR = origNoColor
      }
    })

    it('formats notification for npm install', () => {
      const result = formatNotification(baseInfo)
      expect(result).toContain('Update available: 0.0.11 → 1.0.0')
      expect(result).toContain('npm install -g @uniku/cli')
      expect(result).toContain('NO_UPDATE_NOTIFIER=1')
      // Should NOT contain ANSI codes
      expect(result).not.toContain('\x1b[')
    })

    it('formats notification for standalone binary', () => {
      const result = formatNotification({ ...baseInfo, isStandaloneBinary: true })
      expect(result).toContain('Update available: 0.0.11 → 1.0.0')
      expect(result).toContain('https://github.com/jkomyno/uniku/releases')
      expect(result).not.toContain('npm install')
    })
  })

  describe('without NO_COLOR', () => {
    const origNoColor = process.env.NO_COLOR

    beforeEach(() => {
      delete process.env.NO_COLOR
    })

    afterEach(() => {
      if (origNoColor !== undefined) {
        process.env.NO_COLOR = origNoColor
      }
    })

    it('includes ANSI codes for npm install', () => {
      const result = formatNotification(baseInfo)
      expect(result).toContain('\x1b[')
      expect(result).toContain('0.0.11')
      expect(result).toContain('1.0.0')
      expect(result).toContain('npm install -g @uniku/cli')
    })

    it('includes ANSI codes for standalone binary', () => {
      const result = formatNotification({ ...baseInfo, isStandaloneBinary: true })
      expect(result).toContain('\x1b[')
      expect(result).toContain('https://github.com/jkomyno/uniku/releases')
    })
  })
})
