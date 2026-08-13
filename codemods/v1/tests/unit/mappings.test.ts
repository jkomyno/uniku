import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { ERROR_CODES } from '../../../../packages/uniku/src/errors.ts'
import { ID_GENERATORS } from '../../../../packages/uniku/src/generators.ts'
import { ERROR_CODE_MIGRATIONS } from '../../scripts/mappings.js'

const migrationGuide = readFileSync(
  new URL('../../../../apps/docs/content/docs/migration/v1.mdx', import.meta.url),
  'utf8',
)

const documentedMappings = migrationGuide
  .split('\n')
  .filter((line) => line.startsWith('| `'))
  .flatMap((line) => {
    const [sourceCell, targetCell] = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    const targetCode = targetCell?.match(/^`([^`]+)`$/)?.[1]
    if (!sourceCell || !targetCode) throw new Error(`Could not parse migration-table row: ${line}`)
    return [...sourceCell.matchAll(/`([^`]+)`/g)].map((match) => ({ sourceCode: match[1]!, targetCode }))
  })
  .sort((left, right) => left.sourceCode.localeCompare(right.sourceCode))

const strategyForSource = (sourceCode: string): string => {
  const prefix = sourceCode.slice(0, sourceCode.indexOf('_')).toLowerCase()
  if (prefix === 'uuid') return 'uuid'
  if (prefix === 'cuid2') return 'cuid'
  return prefix
}

describe('legacy error-code mappings', () => {
  it('matches every documented source and target exactly once', () => {
    const actual = ERROR_CODE_MIGRATIONS.map(({ sourceCode, targetCode }) => ({ sourceCode, targetCode })).sort(
      (left, right) => left.sourceCode.localeCompare(right.sourceCode),
    )
    expect(new Set(ERROR_CODE_MIGRATIONS.map(({ sourceCode }) => sourceCode)).size).toBe(ERROR_CODE_MIGRATIONS.length)
    expect(actual).toEqual(documentedMappings)
  })

  it('uses current v1 codes and the generator strategy implied by each documented prefix', () => {
    const currentCodes = new Set<string>(ERROR_CODES)
    const currentStrategies = new Set<string>(ID_GENERATORS)

    for (const migration of ERROR_CODE_MIGRATIONS) {
      expect(currentCodes.has(migration.targetCode), migration.sourceCode).toBe(true)
      expect(currentStrategies.has(migration.strategy), migration.sourceCode).toBe(true)
      expect(migration.strategy, migration.sourceCode).toBe(strategyForSource(migration.sourceCode))
    }
  })
})
