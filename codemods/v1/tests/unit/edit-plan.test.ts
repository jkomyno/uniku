import { describe, expect, it } from 'vitest'

import { type PlannedEdit, planEdits } from '../../scripts/edit-plan.js'

const edit = (startPos: number, endPos: number, insertedText: string, atomicGroup: string): PlannedEdit => ({
  startPos,
  endPos,
  insertedText,
  atomicGroup,
  ruleId: 'uniku-v1/cuid-entry-point',
})

describe('planEdits', () => {
  it('sorts and deduplicates identical edits', () => {
    expect(planEdits([edit(8, 9, 'b', 'second'), edit(1, 2, 'a', 'first'), edit(1, 2, 'a', 'first')])).toEqual({
      edits: [edit(1, 2, 'a', 'first'), edit(8, 9, 'b', 'second')],
      rejectedGroupIds: [],
    })
  })

  it('rejects every atomic group involved in an overlap', () => {
    expect(
      planEdits([edit(0, 4, 'first', 'group-a'), edit(3, 7, 'second', 'group-b'), edit(10, 11, 'kept', 'group-c')]),
    ).toEqual({
      edits: [edit(10, 11, 'kept', 'group-c')],
      rejectedGroupIds: ['group-a', 'group-b'],
    })
  })

  it('rejects the other edits in a conflicting atomic group', () => {
    expect(
      planEdits([edit(0, 4, 'first', 'group-a'), edit(3, 7, 'second', 'group-b'), edit(20, 21, 'also-a', 'group-a')]),
    ).toEqual({
      edits: [],
      rejectedGroupIds: ['group-a', 'group-b'],
    })
  })
})
