import * as Effect from 'effect/Effect'
import { UniqueIdError } from 'uniku/errors'
import { uuidv4 } from 'uniku/uuid/v4'
import { uuidv5 } from 'uniku/uuid/v5'
import { uuidv7 } from 'uniku/uuid/v7'
import { CliError, fromUnikuError } from '@/src/domain/errors'

export type UuidGenerateOptions = {
  readonly count: number
  readonly version: number
  readonly lowercase: boolean
  /** UUID v5 only: the name to derive the ID from. */
  readonly name?: string
  /** UUID v5 only: a namespace alias (dns, url, oid, x500) or a UUID string. */
  readonly namespace?: string
}

const NAMESPACE_HINT = 'Use --namespace dns, url, oid, x500, or a UUID string'

const namespaceUuids: ReadonlyMap<string, string> = new Map([
  ['dns', uuidv5.DNS],
  ['url', uuidv5.URL],
  ['oid', uuidv5.OID],
  ['x500', uuidv5.X500],
])

function resolveNamespace(input: string): string {
  return namespaceUuids.get(input.toLowerCase()) ?? input
}

function invalidOptions(message: string, hint: string): Effect.Effect<never, CliError> {
  return Effect.fail(new CliError({ code: 'INVALID_OPTIONS', message, hint }))
}

function generateUuidV5(count: number, name: string, namespace: string): Effect.Effect<string[], CliError> {
  return Effect.try({
    try: () => {
      const derive = uuidv5.namespace(resolveNamespace(namespace))
      return Array.from({ length: count }, () => derive(name))
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) {
        const { code, message } = fromUnikuError(err)
        return new CliError({ code, message: `Invalid --namespace "${namespace}": ${message}`, hint: NAMESPACE_HINT })
      }
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}

export function generateUuid(options: UuidGenerateOptions): Effect.Effect<string[], CliError> {
  if (options.version === 5) {
    if (options.name === undefined || options.namespace === undefined) {
      return invalidOptions(
        'UUID v5 requires both --name and --namespace',
        'Example: uniku uuid -v 5 --namespace dns --name example.com',
      )
    }
    if (options.count > 1) {
      return invalidOptions(
        'UUID v5 is deterministic: --count greater than 1 would repeat the same ID',
        'Run once per --name to derive several IDs',
      )
    }
    return generateUuidV5(options.count, options.name, options.namespace)
  }

  if (options.name !== undefined || options.namespace !== undefined) {
    return invalidOptions(
      `--name and --namespace only apply to UUID v5, not v${options.version}`,
      'Add -v 5 to derive a name-based UUID, or drop --name and --namespace',
    )
  }

  return Effect.try({
    try: () => {
      const gen = options.version === 7 ? uuidv7 : uuidv4
      const ids: string[] = []
      for (let i = 0; i < options.count; i++) {
        let id = gen()
        if (options.lowercase) {
          id = id.toLowerCase()
        }
        ids.push(id)
      }
      return ids
    },
    catch: (err) => {
      if (err instanceof UniqueIdError) return fromUnikuError(err)
      return new CliError({ code: 'GENERATE_FAILED', message: String(err) })
    },
  })
}
