import { planAbRuns } from '../../scripts/bench-ab'

describe('same-runner A/B benchmark plan', () => {
  it('alternates which side runs first', () => {
    expect(planAbRuns(4)).toEqual([
      ['base', 'head'],
      ['head', 'base'],
      ['base', 'head'],
      ['head', 'base'],
    ])
  })

  it('rejects a repetition count that is not a positive integer', () => {
    for (const repetitions of [0, -1, 1.5, Number.NaN]) {
      expect(() => planAbRuns(repetitions)).toThrow('Repetitions must be a positive integer')
    }
  })
})
