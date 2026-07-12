import { Fragment } from 'react'
import { generatorApis, type GeneratorId } from '@/generated/api-reference'
import { gitConfig } from '@/lib/shared'

type ApiReferenceProps = {
  generator: GeneratorId
}

export function ApiReference({ generator }: ApiReferenceProps) {
  const api = generatorApis[generator]

  return (
    <section className="api-reference">
      <div className="api-reference-heading">
        <div>
          <p className="eyebrow">Generated API reference</p>
          <h2>Public methods</h2>
        </div>
        <a href={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${api.sourcePath}`}>
          Read source
        </a>
      </div>
      <p className="api-reference-intro">{api.description}</p>
      <dl>
        {api.members.map((member) => (
          <div key={member.name}>
            <dt>{member.name}</dt>
            <dd>
              {member.signatures.map((signature) => (
                <Fragment key={signature.text}>
                  {signature.description ? <p>{signature.description}</p> : null}
                  <code>{signature.text}</code>
                </Fragment>
              ))}
              {member.options ? (
                <div className="api-reference-options">
                  <p className="eyebrow">{member.options.typeName}</p>
                  <dl>
                    {member.options.fields.map((field) => (
                      <div key={field.name}>
                        <dt>
                          {field.name}
                          {field.optional ? '?' : ''}
                        </dt>
                        <dd>
                          {field.description ? <p>{field.description}</p> : null}
                          <code>{field.type}</code>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              <div className="api-member-example">
                <span>Example</span>
                <code>{member.example.input}</code>
                <code>{`// => ${member.example.output}`}</code>
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
