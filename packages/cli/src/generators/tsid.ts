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
      const ids: string[] = []

      if (options.timestamp === undefined) {
        const configuration =
          options.node !== undefined || options.nodeBits !== undefined
            ? { node: options.node, nodeBits: options.nodeBits }
            : undefined
        for (let i = 0; i < options.count; i++) {
          ids.push(tsid.toString(tsid(configuration)))
        }
        return ids
      }

      // A fixed timestamp bypasses the library's shared sequence. Keep one
      // node for this batch and advance time when its explicit counter fills.
      const nodeBits = options.nodeBits ?? 10
      const counterBits = 22 - nodeBits
      const counterRange = 2 ** counterBits
      let node = options.node

      for (let i = 0; i < options.count; i++) {
        const value = tsid({
          msecs: options.timestamp + Math.floor(i / counterRange),
          counter: i % counterRange,
          node,
          nodeBits,
        })
        node ??= Number((value >> BigInt(counterBits)) & BigInt((1 << nodeBits) - 1))
        ids.push(tsid.toString(value))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
