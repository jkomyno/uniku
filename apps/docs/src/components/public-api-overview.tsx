import { Fragment, type ReactNode } from 'react'
import { generatorApis, type GeneratorId } from '@/generated/api-reference'

type PublicApiFamily = {
  callStyle: ReactNode
  generators: readonly GeneratorId[]
  only?: boolean
}

const publicApiFamilies: readonly PublicApiFamily[] = [
  {
    callStyle: 'Callable',
    generators: ['uuid-v7', 'ulid', 'ksuid', 'objectid', 'xid'],
  },
  {
    callStyle: 'Callable',
    generators: ['uuid-v4'],
  },
  {
    callStyle: 'Name-based callable',
    generators: ['uuid-v5'],
  },
  {
    callStyle: 'Prefix-first callable',
    generators: ['typeid'],
  },
  {
    callStyle: (
      <>
        <code>bigint</code> primary value
      </>
    ),
    generators: ['tsid'],
  },
  {
    callStyle: 'Callable',
    generators: ['cuid-v2', 'nanoid'],
    only: true,
  },
]

type PublicApiSurface = {
  hasBufferCall: boolean
  helpers: readonly string[]
}

function publicApiSurface(generator: GeneratorId): PublicApiSurface {
  const [call, ...helpers] = generatorApis[generator].members
  if (!call) throw new Error(`Missing callable API for ${generator}`)

  return {
    hasBufferCall: call.signatures.some((signature) => signature.text.includes('buf:')),
    helpers: helpers.map((helper) => helper.name),
  }
}

function sameSurface(left: PublicApiSurface, right: PublicApiSurface): boolean {
  return left.hasBufferCall === right.hasBufferCall && JSON.stringify(left.helpers) === JSON.stringify(right.helpers)
}

function validateFamilyCoverage(): void {
  const counts = new Map<GeneratorId, number>()
  for (const family of publicApiFamilies) {
    for (const generator of family.generators) counts.set(generator, (counts.get(generator) ?? 0) + 1)
  }

  // SAFETY: generatorApis is generated with exactly one entry per GeneratorId, so its own keys are GeneratorIds.
  const invalid = (Object.keys(generatorApis) as GeneratorId[]).filter((generator) => counts.get(generator) !== 1)
  if (invalid.length > 0) throw new Error(`Public API family coverage has drifted: ${invalid.join(', ')}`)
}

function surfaceForFamily(family: PublicApiFamily): PublicApiSurface {
  const [first, ...rest] = family.generators
  if (!first) throw new Error('Public API families cannot be empty')

  const surface = publicApiSurface(first)
  for (const generator of rest) {
    if (!sameSurface(surface, publicApiSurface(generator))) {
      throw new Error(`Public API family has drifted: ${family.generators.join(', ')}`)
    }
  }

  return surface
}

function moduleName(generator: GeneratorId): string {
  if (generator.startsWith('uuid-') || generator === 'cuid-v2') return generator.replace('-', '/')
  return generator
}

function helperLabel(helper: string): string {
  return /^[A-Z][A-Z0-9]*$/.test(helper) ? helper : `${helper}()`
}

function List({ items }: { items: readonly ReactNode[] }) {
  return items.map((item, index) => (
    <Fragment key={index}>
      {index > 0 ? ', ' : null}
      {item}
    </Fragment>
  ))
}

export function PublicApiOverview() {
  validateFamilyCoverage()

  return (
    <div className="relative overflow-auto prose-no-margin my-6">
      <table>
        <thead>
          <tr>
            <th>Modules</th>
            <th>Public API</th>
          </tr>
        </thead>
        <tbody>
          {publicApiFamilies.map((family) => {
            const surface = surfaceForFamily(family)
            const capabilities: ReactNode[] = [family.callStyle]
            if (surface.hasBufferCall) capabilities.push('buffer write')
            capabilities.push(...surface.helpers.map((helper) => <code key={helper}>{helperLabel(helper)}</code>))

            return (
              <tr key={family.generators.join(',')}>
                <td>
                  <List
                    items={family.generators.map((generator) => (
                      <a key={generator} href={`/docs/reference/${generator}`}>
                        <code>{moduleName(generator)}</code>
                      </a>
                    ))}
                  />
                </td>
                <td>
                  <List items={capabilities} />
                  {family.only ? ' only' : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
