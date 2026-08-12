import { Fragment, type ReactNode } from 'react'
import { generatorApis, type GeneratorId } from '@/generated/api-reference'

type PublicApiFamily = {
  callShape: ReactNode
  generators: readonly GeneratorId[]
  only?: boolean
}

const publicApiFamilies: readonly PublicApiFamily[] = [
  {
    callShape: 'Callable',
    generators: ['uuid-v7', 'ulid', 'ksuid', 'objectid', 'xid'],
  },
  {
    callShape: 'Callable',
    generators: ['uuid-v4'],
  },
  {
    callShape: 'Prefix-first callable',
    generators: ['typeid'],
  },
  {
    callShape: (
      <>
        <code>bigint</code> primary value
      </>
    ),
    generators: ['tsid'],
  },
  {
    callShape: 'Callable',
    generators: ['cuid-v2', 'nanoid'],
    only: true,
  },
]

type PublicApiShape = {
  hasBufferCall: boolean
  helpers: readonly string[]
}

function publicApiShape(generator: GeneratorId): PublicApiShape {
  const [call, ...helpers] = generatorApis[generator].members
  if (!call) throw new Error(`Missing callable API for ${generator}`)

  return {
    hasBufferCall: call.signatures.some((signature) => signature.text.includes('buf:')),
    helpers: helpers.map((helper) => helper.name),
  }
}

function sameShape(left: PublicApiShape, right: PublicApiShape): boolean {
  return left.hasBufferCall === right.hasBufferCall && JSON.stringify(left.helpers) === JSON.stringify(right.helpers)
}

function validateFamilyCoverage(): void {
  const counts = new Map<GeneratorId, number>()
  for (const family of publicApiFamilies) {
    for (const generator of family.generators) counts.set(generator, (counts.get(generator) ?? 0) + 1)
  }

  const invalid = (Object.keys(generatorApis) as GeneratorId[]).filter((generator) => counts.get(generator) !== 1)
  if (invalid.length > 0) throw new Error(`Public API family coverage has drifted: ${invalid.join(', ')}`)
}

function shapeForFamily(family: PublicApiFamily): PublicApiShape {
  const [first, ...rest] = family.generators
  if (!first) throw new Error('Public API families cannot be empty')

  const shape = publicApiShape(first)
  for (const generator of rest) {
    if (!sameShape(shape, publicApiShape(generator))) {
      throw new Error(`Public API family has drifted: ${family.generators.join(', ')}`)
    }
  }

  return shape
}

function moduleName(generator: GeneratorId): string {
  if (generator.startsWith('uuid-') || generator === 'cuid-v2') return generator.replace('-', '/')
  return generator
}

function helperLabel(helper: string): string {
  return helper === 'NIL' || helper === 'MAX' ? helper : `${helper}()`
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
            const shape = shapeForFamily(family)
            const capabilities: ReactNode[] = [family.callShape]
            if (shape.hasBufferCall) capabilities.push('buffer write')
            capabilities.push(...shape.helpers.map((helper) => <code key={helper}>{helperLabel(helper)}</code>))

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
