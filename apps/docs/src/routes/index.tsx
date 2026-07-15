import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Blocks, Box, Cpu, Gauge, Globe2, TerminalSquare } from 'lucide-react'
import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '@/lib/layout'

const idRail = [
  '019b8f1e-70d4-7c5a-b7d2-18f5cc7b95f0',
  '01JPNBWW9Q54Y5DVXR8F11H3TM',
  'user_01h2xcejqtf2nbrexx3vqjhp41',
]

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="landing-shell">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">Ten type-safe strategies. One API.</p>
            <h1>Ten ID strategies. The fastest implementation of each.</h1>
            <p className="hero-summary">
              <code>uniku</code> puts UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, ObjectID, XID, and TSID behind one
              consistent API. In the current CI benchmark, every generator beats its dedicated npm alternative.
            </p>
            <div className="hero-actions">
              <Link className="primary-action" to="/docs/$" params={{ _splat: '' }}>
                Read the docs <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <a className="secondary-action" href="https://www.npmjs.com/package/uniku">
                View on npm
              </a>
            </div>
          </div>

          <div className="id-atlas" aria-label="Examples of supported identifier formats">
            <div className="atlas-heading">
              <span>Format specimens</span>
            </div>
            <pre className="atlas-code" aria-label="uniku library example">
              <code>import {'{'} uuidv7 {'}'} from 'uniku/uuid/v7'</code>
              <code>const id = uuidv7()</code>
            </pre>
            <div className="atlas-rail">
              {idRail.map((id, index) => (
                <div className="atlas-row" key={id}>
                  <span className="atlas-index">0{index + 1}</span>
                  <code>{id}</code>
                </div>
              ))}
            </div>
            <p>Pick the shape your system needs. Your runtime pays only for the generator you import.</p>
          </div>
        </section>

        <section className="value-grid" aria-label="Why use uniku">
          <article>
            <Gauge aria-hidden="true" size={20} />
            <h2>Fastest across the suite</h2>
            <p>
              Every strategy beats its dedicated npm alternative in the current isolated-process{' '}
              <Link to="/docs/$" params={{ _splat: 'guides/performance' }}>
                CI benchmark
              </Link>
              .
            </p>
          </article>
          <article>
            <Box aria-hidden="true" size={20} />
            <h2>Ten strategies, one type-safe API</h2>
            <p>Each direct entry point exposes a callable generator with matching typed helpers.</p>
          </article>
          <article>
            <Globe2 aria-hidden="true" size={20} />
            <h2>Portable by default</h2>
            <p>Built on web standards, tested end to end across all major JavaScript runtimes.</p>
          </article>
        </section>

        <section className="companion-panel">
          <div>
            <p className="eyebrow">The CLI companion</p>
            <h2>Generate, inspect, and validate from your terminal.</h2>
            <p>Install <code>@uniku/cli</code> when the ID belongs in a shell script, a migration, or a debugging session.</p>
          </div>
          <pre aria-label="uniku CLI example"><TerminalSquare aria-hidden="true" size={17} /> uniku uuid -v 7</pre>
          <Link className="text-link" to="/docs/$" params={{ _splat: 'cli' }}>
            Explore the CLI <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </section>

        <section className="start-row">
          <div>
            <p className="eyebrow">Start here</p>
            <h2>Choose an ID format with intent.</h2>
          </div>
          <div className="start-links">
            <Link className="text-link" to="/docs/$" params={{ _splat: 'guides/choosing-an-id' }}>
              Compare formats <Cpu aria-hidden="true" size={15} />
            </Link>
            <Link className="text-link" to="/docs/$" params={{ _splat: 'guides/integrations' }}>
              Browse integrations <Blocks aria-hidden="true" size={15} />
            </Link>
          </div>
        </section>
      </main>
    </HomeLayout>
  )
}
