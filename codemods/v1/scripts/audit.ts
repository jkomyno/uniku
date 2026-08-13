import type { MigrationRuleId } from './mappings.ts'

export interface AuditFinding {
  readonly ruleId: MigrationRuleId
  readonly path: string
  readonly line: number
  readonly column: number
  readonly reason: string
  readonly guideUrl: string
}

export interface AuditCandidate extends AuditFinding {
  readonly startPos: number
  readonly endPos: number
}

const compareCandidates = (left: AuditCandidate, right: AuditCandidate): number =>
  left.startPos - right.startPos ||
  left.endPos - right.endPos ||
  left.ruleId.localeCompare(right.ruleId) ||
  left.reason.localeCompare(right.reason)

const candidateKey = (candidate: AuditCandidate): string =>
  `${candidate.startPos}:${candidate.endPos}:${candidate.ruleId}:${candidate.reason}`

export const classifyAuditCandidates = (candidates: readonly AuditCandidate[]): readonly AuditFinding[] => {
  const seen = new Set<string>()
  const findings: AuditFinding[] = []

  for (const candidate of [...candidates].sort(compareCandidates)) {
    const key = candidateKey(candidate)
    if (seen.has(key)) continue
    seen.add(key)

    const { startPos: _startPos, endPos: _endPos, ...finding } = candidate
    findings.push(finding)
  }

  return findings
}

export const renderAuditFinding = (finding: AuditFinding): string =>
  JSON.stringify({
    type: 'uniku-v1-audit',
    manualMigrationRequired: true,
    message: `Manual migration required: ${finding.reason}`,
    ...finding,
  })
