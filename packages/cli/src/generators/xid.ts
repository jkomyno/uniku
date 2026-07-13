import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { xid } from 'uniku/xid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type XidGenerateOptions = {
  readonly count: number
  readonly timestamp?: number
}

export function generateXid(options: XidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        const xidOptions = options.timestamp != null ? { secs: options.timestamp } : undefined
        ids.push(xid(xidOptions))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
