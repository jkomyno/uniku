import type { BenchRunOptions } from 'vitest'

export const BENCH_RUN_OPTIONS: BenchRunOptions = {
  iterations: 100,
  time: 1500,
  warmupTime: 750,
  warmupIterations: 100,
}

/**
 * A task result that tinybench reads in place of its own per-call timing.
 * `result` keeps the last return value reachable, so the engine cannot drop
 * calls whose results the benchmark ignores.
 */
type BatchSample = {
  overriddenDuration: number
  overriddenIterationCost: number
  result: unknown
}

// A batch must last well above the timer resolution. Fewer, longer samples also
// keep tinybench's per-sample bookkeeping, about a microsecond each, from
// stretching a 1.5 s budget into many seconds of wall time.
const TARGET_BATCH_MS = 0.05
const MAX_BATCH_SIZE = 1 << 16
// A cold call includes compilation and would pin the batch size near 1.
const CALIBRATION_WARMUP_MS = 10
const CALIBRATION_WARMUP_BATCH = 64

/**
 * Time `task` in batches. Each tinybench sample runs the task as many times as
 * it takes to fill {@link TARGET_BATCH_MS} and reports the mean duration of one
 * call, so latency and throughput keep their per-call meaning.
 *
 * The batch size is calibrated on the first call, which tinybench makes during
 * warmup.
 */
export function batched(task: () => unknown): () => BatchSample {
  let batchSize = 0
  return () => {
    if (batchSize === 0) {
      batchSize = calibrateBatchSize(task)
    }
    return runBatch(task, batchSize)
  }
}

function calibrateBatchSize(task: () => unknown): number {
  let warmed = 0
  while (warmed < CALIBRATION_WARMUP_MS) {
    warmed += runBatch(task, CALIBRATION_WARMUP_BATCH).overriddenIterationCost
  }

  let batchSize = 1
  while (batchSize < MAX_BATCH_SIZE && runBatch(task, batchSize).overriddenIterationCost < TARGET_BATCH_MS) {
    batchSize *= 2
  }
  return batchSize
}

function runBatch(task: () => unknown, batchSize: number): BatchSample {
  let result: unknown
  const start = performance.now()
  for (let call = 0; call < batchSize; call++) {
    result = task()
  }
  const elapsed = performance.now() - start
  return { overriddenDuration: elapsed / batchSize, overriddenIterationCost: elapsed, result }
}
