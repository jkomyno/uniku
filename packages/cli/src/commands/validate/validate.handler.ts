import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { CliError, ValidationFailedError } from '@/src/domain/errors'
import type { IdType, ValidationResult } from '@/src/domain/types'
import { OutputService, validationOutput } from '@/src/services/OutputService'
import { StdinService } from '@/src/services/StdinService'
import { validateAs, validateAutoDetect } from '@/src/validators/validate'

export type ValidateParams = {
  readonly id: Option.Option<string>
  readonly type: Option.Option<IdType>
  readonly stdin: boolean
  readonly json: boolean
  readonly quiet: boolean
}

export const runValidate = Effect.fn('cli.validate')(function* ({ id, type, stdin, json, quiet }: ValidateParams) {
  const output = yield* OutputService
  const stdinService = yield* StdinService
  const expectedType = Option.getOrUndefined(type)

  let ids: readonly string[]

  if (stdin) {
    ids = yield* stdinService.readLines()
    if (ids.length === 0) {
      return yield* new CliError({ code: 'NO_INPUT', message: 'No IDs provided on stdin' })
    }
  } else if (Option.isSome(id)) {
    ids = [id.value]
  } else {
    return yield* new CliError({
      code: 'NO_INPUT',
      message: 'No ID provided',
      hint: 'Pass an ID as argument or use --stdin',
    })
  }

  const results: ValidationResult[] = ids.map((value) =>
    expectedType ? validateAs(value, expectedType) : validateAutoDetect(value),
  )

  if (!quiet) {
    yield* output.write(validationOutput(results), { json })
  }

  if (results.some((result) => !result.valid)) {
    return yield* new ValidationFailedError({ message: 'One or more IDs are invalid' })
  }
})
