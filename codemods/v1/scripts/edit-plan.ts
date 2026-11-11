import type { Edit } from 'codemod:ast-grep'

import type { MigrationRuleId } from './mappings.ts'

export interface PlannedEdit extends Edit {
  readonly atomicGroup: string
  readonly ruleId: MigrationRuleId
}

export interface EditPlan {
  readonly edits: readonly PlannedEdit[]
  readonly rejectedGroupIds: readonly string[]
}

const compareEdits = (left: PlannedEdit, right: PlannedEdit): number =>
  left.startPos - right.startPos ||
  left.endPos - right.endPos ||
  left.insertedText.localeCompare(right.insertedText) ||
  left.atomicGroup.localeCompare(right.atomicGroup) ||
  left.ruleId.localeCompare(right.ruleId)

const isIdenticalEdit = (left: PlannedEdit, right: PlannedEdit): boolean =>
  left.startPos === right.startPos && left.endPos === right.endPos && left.insertedText === right.insertedText

const editsOverlap = (left: PlannedEdit, right: PlannedEdit): boolean =>
  left.startPos < right.endPos && right.startPos < left.endPos

export const planEdits = (candidates: readonly PlannedEdit[]): EditPlan => {
  const sorted = [...candidates].sort(compareEdits)
  const deduplicated = sorted.filter(
    (candidate, index) => index === 0 || !isIdenticalEdit(sorted[index - 1]!, candidate),
  )
  const rejectedGroupIds = new Set<string>()

  for (let leftIndex = 0; leftIndex < deduplicated.length; leftIndex += 1) {
    const left = deduplicated[leftIndex]!

    for (let rightIndex = leftIndex + 1; rightIndex < deduplicated.length; rightIndex += 1) {
      const right = deduplicated[rightIndex]!
      if (right.startPos >= left.endPos) break
      if (!editsOverlap(left, right)) continue

      rejectedGroupIds.add(left.atomicGroup)
      rejectedGroupIds.add(right.atomicGroup)
    }
  }

  const rejected = [...rejectedGroupIds].sort()

  return {
    edits: deduplicated.filter((edit) => !rejectedGroupIds.has(edit.atomicGroup)),
    rejectedGroupIds: rejected,
  }
}
