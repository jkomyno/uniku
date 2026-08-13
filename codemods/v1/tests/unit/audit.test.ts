import { describe, expect, it } from 'vitest'

import { type AuditCandidate, classifyAuditCandidates, renderAuditFinding } from '../../scripts/audit.js'

const finding = (startPos: number, line: number, reason = 'Manual migration is required.'): AuditCandidate => ({
  startPos,
  endPos: startPos + 1,
  ruleId: 'uniku-v1/counter-options',
  path: 'src/example.ts',
  line,
  column: 3,
  reason,
  guideUrl: 'https://example.test/guide',
})

describe('audit findings', () => {
  it('sorts by source position and removes exact duplicates', () => {
    expect(classifyAuditCandidates([finding(8, 2), finding(1, 1), finding(1, 1)])).toEqual([
      {
        ruleId: 'uniku-v1/counter-options',
        path: 'src/example.ts',
        line: 1,
        column: 3,
        reason: 'Manual migration is required.',
        guideUrl: 'https://example.test/guide',
      },
      {
        ruleId: 'uniku-v1/counter-options',
        path: 'src/example.ts',
        line: 2,
        column: 3,
        reason: 'Manual migration is required.',
        guideUrl: 'https://example.test/guide',
      },
    ])
  })

  it('renders one stable machine-readable record', () => {
    const [classified] = classifyAuditCandidates([finding(1, 1)])

    expect(renderAuditFinding(classified!)).toBe(
      '{"type":"uniku-v1-audit","manualMigrationRequired":true,"message":"Manual migration required: Manual migration is required.","ruleId":"uniku-v1/counter-options","path":"src/example.ts","line":1,"column":3,"reason":"Manual migration is required.","guideUrl":"https://example.test/guide"}',
    )
  })
})
