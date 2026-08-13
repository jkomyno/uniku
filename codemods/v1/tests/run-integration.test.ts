import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import type { AuditFinding } from '../scripts/audit.js'
import expectedFindings from './integration/expected-findings.json'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(testDirectory, '..')
const codemodBinary = resolve(packageRoot, 'node_modules/.bin/codemod')

const run = (command: string, args: readonly string[], cwd: string): string =>
  execFileSync(command, [...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'integration@example.test',
      GIT_AUTHOR_NAME: 'uniku integration',
      GIT_COMMITTER_EMAIL: 'integration@example.test',
      GIT_COMMITTER_NAME: 'uniku integration',
      NO_COLOR: '1',
    },
  })

const collectFiles = (directory: string): string[] => {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(path))
    else files.push(path)
  }
  return files.sort()
}

const readTree = (directory: string): Record<string, string> =>
  Object.fromEntries(
    collectFiles(directory).map((path): readonly [string, string] => [
      relative(directory, path),
      readFileSync(path, 'utf8'),
    ]),
  )

const findAuditRecords = (value: unknown): AuditFinding[] => {
  if (typeof value === 'string') {
    return value.split('\n').flatMap((line) => {
      try {
        return findAuditRecords(JSON.parse(line) as unknown)
      } catch {
        return []
      }
    })
  }
  if (Array.isArray(value)) return value.flatMap(findAuditRecords)
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  const nested = Object.values(record).flatMap(findAuditRecords)
  if (record.type !== 'uniku-v1-audit') return nested

  return [
    {
      ruleId: String(record.ruleId) as AuditFinding['ruleId'],
      path: String(record.path),
      line: Number(record.line),
      column: Number(record.column),
      reason: String(record.reason),
      guideUrl: String(record.guideUrl),
    },
    ...nested,
  ]
}

const parseAuditOutput = (output: string): AuditFinding[] =>
  output
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return findAuditRecords(JSON.parse(line) as unknown)
      } catch {
        return []
      }
    })
    .sort(
      (left, right) =>
        left.path.localeCompare(right.path) ||
        left.line - right.line ||
        left.column - right.column ||
        left.ruleId.localeCompare(right.ruleId),
    )

describe('local workflow integration', () => {
  it('migrates the fixture, emits structured findings, and is idempotent', () => {
    const target = mkdtempSync(join(tmpdir(), 'uniku-v1-codemod-'))

    try {
      cpSync(resolve(testDirectory, 'integration/consumer'), target, { recursive: true })
      run('git', ['init', '--quiet'], target)
      run('git', ['add', '.'], target)
      run('git', ['commit', '--quiet', '-m', 'fixture'], target)

      const output = run(
        codemodBinary,
        [
          'workflow',
          'run',
          '-w',
          packageRoot,
          '-t',
          target,
          '--no-interactive',
          '--format',
          'jsonl',
          '--disable-analytics',
        ],
        packageRoot,
      )

      expect(readTree(target)).toEqual(readTree(resolve(testDirectory, 'integration/expected')))
      expect(parseAuditOutput(output)).toEqual(expectedFindings)

      run('git', ['add', '.'], target)
      run('git', ['commit', '--quiet', '-m', 'migrated'], target)
      run(
        codemodBinary,
        [
          'workflow',
          'run',
          '-w',
          packageRoot,
          '-t',
          target,
          '--no-interactive',
          '--format',
          'jsonl',
          '--disable-analytics',
        ],
        packageRoot,
      )
      expect(run('git', ['status', '--porcelain'], target)).toBe('')
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  }, 30_000)
})
