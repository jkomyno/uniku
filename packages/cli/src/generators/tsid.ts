import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { tsid } from 'uniku/tsid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type TsidGenerateOptions = {
  readonly count: number
  readonly timestamp?: number
  readonly node?: number
  readonly nodeBits?: number
}

export function generateTsid(options: TsidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      // `tsid()` treats a *truthy* options object as a request for fully
      // deterministic output (bypassing the persistent node/counter state),
      // even if every field on it is `undefined`. So only build an options
      // object when at least one of timestamp/node/nodeBits was actually
      // requested - otherwise pass `undefined` to preserve the persistent,
      // stateful default behavior every other no-flag CLI invocation gets.
      const hasOptions = options.timestamp != null || options.node != null || options.nodeBits != null

      const ids: string[] = []

      if (!hasOptions) {
        for (let i = 0; i < options.count; i++) {
          // tsid() returns a bigint - convert immediately so no raw bigint
          // ever reaches this CLI-facing `string[]` surface.
          ids.push(tsid.toString(tsid()))
        }
        return ids
      }

      // Any of timestamp/node/nodeBits bypasses the core generator's persistent
      // counter (options bypass state entirely, per tsid()'s contract), so a
      // naive per-call options object would have each id draw an independent
      // random counter instead of an incrementing one - with a small counterBits
      // (e.g. --node-bits 20 leaves only 2 counter bits), that makes duplicate
      // ids within the batch near-certain. Step the counter across the loop
      // instead, rolling over into the timestamp on overflow, mirroring the
      // core generator's own clock-drift-ahead behavior (R7).
      const nodeBits = options.nodeBits ?? 10
      const counterRange = 2 ** (22 - nodeBits)
      const baseMsecs = options.timestamp ?? Date.now()

      for (let i = 0; i < options.count; i++) {
        const tsidOpts = {
          msecs: baseMsecs + Math.floor(i / counterRange),
          counter: i % counterRange,
          ...(options.node != null ? { node: options.node } : {}),
          ...(options.nodeBits != null ? { nodeBits: options.nodeBits } : {}),
        }
        ids.push(tsid.toString(tsid(tsidOpts)))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
