import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { nanoid } from 'uniku/nanoid'
import { NANOID_ALPHABET_PRESETS } from '@/src/domain/constants'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type NanoidGenerateOptions = {
  readonly count: number
  readonly size: number
  readonly alphabet?: string
}

function resolveAlphabet(input?: string): string | undefined {
  if (!input) return undefined
  return NANOID_ALPHABET_PRESETS[input] ?? input
}

export function generateNanoid(options: NanoidGenerateOptions): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const alphabet = resolveAlphabet(options.alphabet)
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        ids.push(nanoid({ size: options.size, alphabet }))
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError('GENERATE_FAILED', String(err))
    },
  })
}
