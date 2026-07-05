import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { typeid } from 'uniku/typeid'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type TypeidGenerateOptions = {
  readonly count: number
  readonly prefix: string
}

export function generateTypeid(options: TypeidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        ids.push(typeid(options.prefix))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
