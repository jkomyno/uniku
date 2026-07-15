const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/core-D-5ug1ry.js","assets/dist-CbNaFM1z.js","assets/index-CiBDTGke.js","assets/rolldown-runtime-QTnfLwEv.js","assets/createLucideIcon-BUKHJUio.js","assets/dist-WyagwRHs.js","assets/jsx-runtime-By8HlURe.js","assets/dist-QbF4R8Xm.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{n as t}from"./createLucideIcon-BUKHJUio.js";import{_ as n}from"./dist-WyagwRHs.js";import{t as r}from"./jsx-runtime-By8HlURe.js";import{F as i,a,i as o,v as s}from"./index-CiBDTGke.js";var c=e(t(),1),l=e(r(),1);async function u(e,t){let n=e.getBundledThemes(),r=t.filter(t=>{if(typeof t==`string`&&!(t in n))return!1;try{return e.getTheme(t),!1}catch{return!0}});r.length>0&&await e.loadTheme(...r)}function d(e){return`theme`in e?[e.theme]:Object.values(e.themes).filter(e=>e!==void 0)}function f(e){let t;return{init(n){return t=e.init(n)},getOrInit(){return t??this.init()}}}async function p(e,t,n){let{fallbackLanguage:r=`text`,...a}=n,{isSpecialLang:o}=await i(async()=>{let{isSpecialLang:e}=await import(`./core-D-5ug1ry.js`);return{isSpecialLang:e}},__vite__mapDeps([0,1,2,3,4,5,6]));return!o(a.lang)&&!(a.lang in e.getBundledLanguages())&&!e.getLoadedLanguages().includes(a.lang)&&(a.lang=r),await Promise.all([u(e,d(a)),e.loadLanguage(a.lang)]),e.codeToHast(t,a)}function m(e,t,n,r){let[i,a]=(0,c.useState)(n.defaultValue),o=(0,c.useRef)(null);return(0,c.useEffect)(()=>{async function r(){return s(await p(typeof e==`function`?await e():e,t,n),{...l,components:n.components})}let i=r();return o.current=i,i.then(e=>{o.current===i&&a(e)}),()=>{o.current=null}},r),i}var h=(0,c.createContext)(void 0);function g(e){let t=(0,c.use)(h);return(0,l.jsx)(o,{...e,...t,className:n(`my-0`,e.className,t?.className),children:(0,l.jsx)(a,{children:e.children})})}function _({lang:e,code:t,codeblock:n,options:r,wrapInSuspense:i=!0,highlighter:a}){let o=(0,c.useId)(),s={lang:e,defaultColor:!1,...r,components:{pre:g,...r.components}},u=m(a,t,s,[o,e,t]);return i&&(u??=(0,l.jsx)(v,{code:t,components:s.components})),(0,l.jsx)(h,{value:n,children:u})}function v({code:e,components:t={}}){let{pre:n=`pre`,code:r=`code`}=t;return(0,l.jsx)(n,{children:(0,l.jsx)(r,{children:e.split(`
`).map((e,t)=>(0,l.jsx)(`span`,{className:`line`,children:e},t))})})}var y=f({async init(e){let{createHighlighter:t,createJavaScriptRegexEngine:n}=await i(async()=>{let{createHighlighter:e,createJavaScriptRegexEngine:t}=await import(`./dist-QbF4R8Xm.js`);return{createHighlighter:e,createJavaScriptRegexEngine:t}},__vite__mapDeps([7,3,2,4,5,6,1]));return t({langs:[],themes:[],langAlias:e?.langAlias,engine:n()})}});function b(e){return(0,l.jsx)(_,{highlighter:()=>y.getOrInit(),options:{themes:{light:`github-light`,dark:`github-dark`}},...e})}var x=`import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { bytea, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { ulid } from 'uniku/ulid'

const events = pgTable('events', {
  id: bytea().primaryKey(),
  name: text().notNull(),
})

const client = new PGlite()
const db = drizzle({ client })

try {
  await db.execute(sql\`
    create table events (
      id bytea primary key,
      name text not null
    )
  \`)

  const id = ulid()
  const [event] = await db
    .insert(events)
    .values({
      id: Buffer.from(ulid.toBytes(id)),
      name: 'account.created',
    })
    .returning()

  if (!event) throw new Error('The inserted event was not returned')

  const restoredId = ulid.fromBytes(event.id)

  assert.equal(restoredId, id)
  assert.equal(event.name, 'account.created')

  console.log({
    id: restoredId,
    name: event.name,
  })
} finally {
  await client.close()
}
`,S=`import assert from 'node:assert/strict'
import { Context, Effect, Layer } from 'effect'
import { typeid } from 'uniku/typeid'

class UserIds extends Context.Service<
  UserIds,
  {
    readonly next: () => Effect.Effect<string>
  }
>()('examples/UserIds') {
  static readonly layer = Layer.effect(
    UserIds,
    Effect.gen(function* () {
      const next = Effect.fn('UserIds.next')(function* () {
        return yield* Effect.sync(() => typeid('user'))
      })

      return UserIds.of({ next })
    }),
  )
}

const program = Effect.gen(function* () {
  const userIds = yield* UserIds
  return yield* userIds.next()
})

const userId = Effect.runSync(program.pipe(Effect.provide(UserIds.layer)))

assert(typeid.isValid(userId))
assert.equal(typeid.prefix(userId), 'user')

console.log({ userId })
`,C=`import assert from 'node:assert/strict'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { nanoid } from 'uniku/nanoid'

const app = new Hono()

app.use(
  '*',
  requestId({
    generator: () => nanoid(),
  }),
)

app.get('/', (context) => context.json({ requestId: context.get('requestId') }))

const response = await app.request('/')
const body: unknown = await response.json()

assert(body && typeof body === 'object' && 'requestId' in body)
assert(typeof body.requestId === 'string')
assert(nanoid.isValid(body.requestId))
assert.equal(response.headers.get('X-Request-Id'), body.requestId)

console.log(body)
`,w={title:`Integrations`,description:`Runnable starting points for Hono, Drizzle ORM v1, and Effect v4.`},T=`



These examples are the complete, executable files from the \`uniku\` repository. Clone the repository and run \`pnpm examples:check\` to typecheck and execute all three.

## Hono request IDs with Nanoid [#hono-request-ids-with-nanoid]

Hono's request ID middleware accepts a synchronous \`generator\`. When a request does not already carry a valid \`X-Request-Id\` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header.

<DynamicCodeBlock lang="ts" code="honoNanoid" codeblock="{ title: 'hono-nanoid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:hono\`.

## Drizzle ORM v1 with binary ULIDs [#drizzle-orm-v1-with-binary-ulids]

Drizzle ORM v1 provides a PostgreSQL \`bytea()\` column. \`ulid.toBytes()\` produces the canonical 16-byte representation; \`Buffer.from()\` adapts those bytes to Drizzle's PostgreSQL insert type. The selected value remains compatible with \`ulid.fromBytes()\`.

The example uses an in-memory PGlite database, so it needs no external PostgreSQL server. It creates a table, inserts one event, reads the returned binary ID, and restores the canonical ULID string.

<DynamicCodeBlock lang="ts" code="drizzleUlid" codeblock="{ title: 'drizzle-ulid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:drizzle\`.

:::note
The example pins Drizzle ORM \`1.0.0-rc.4\`. The v1 line is still a release candidate, so check its release notes before changing that version.
:::

## Effect v4 services with TypeID [#effect-v4-services-with-typeid]

An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced \`next()\` effect and returns TypeID strings with a stable \`user_\` prefix.

<DynamicCodeBlock lang="ts" code="effectTypeid" codeblock="{ title: 'effect-typeid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:effect\`.

:::note
This example uses the same exact Effect v4 beta as the \`uniku\` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin.
:::
`,E={contents:[{heading:void 0,content:"These examples are the complete, executable files from the `uniku` repository. Clone the repository and run `pnpm examples:check` to typecheck and execute all three."},{heading:`hono-request-ids-with-nanoid`,content:"Hono's request ID middleware accepts a synchronous `generator`. When a request does not already carry a valid `X-Request-Id` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header."},{heading:`hono-request-ids-with-nanoid`,content:"Run it with `pnpm --filter @uniku/examples example:hono`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"Drizzle ORM v1 provides a PostgreSQL `bytea()` column. `ulid.toBytes()` produces the canonical 16-byte representation; `Buffer.from()` adapts those bytes to Drizzle's PostgreSQL insert type. The selected value remains compatible with `ulid.fromBytes()`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:`The example uses an in-memory PGlite database, so it needs no external PostgreSQL server. It creates a table, inserts one event, reads the returned binary ID, and restores the canonical ULID string.`},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"Run it with `pnpm --filter @uniku/examples example:drizzle`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:`:::note
The example pins Drizzle ORM \`1.0.0-rc.4\`. The v1 line is still a release candidate, so check its release notes before changing that version.
:::`},{heading:`effect-v4-services-with-typeid`,content:"An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced `next()` effect and returns TypeID strings with a stable `user_` prefix."},{heading:`effect-v4-services-with-typeid`,content:"Run it with `pnpm --filter @uniku/examples example:effect`."},{heading:`effect-v4-services-with-typeid`,content:`:::note
This example uses the same exact Effect v4 beta as the \`uniku\` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin.
:::`}],headings:[{id:`hono-request-ids-with-nanoid`,content:`Hono request IDs with Nanoid`},{id:`drizzle-orm-v1-with-binary-ulids`,content:`Drizzle ORM v1 with binary ULIDs`},{id:`effect-v4-services-with-typeid`,content:`Effect v4 services with TypeID`}]},D=[{depth:2,url:`#hono-request-ids-with-nanoid`,title:(0,l.jsx)(l.Fragment,{children:`Hono request IDs with Nanoid`})},{depth:2,url:`#drizzle-orm-v1-with-binary-ulids`,title:(0,l.jsx)(l.Fragment,{children:`Drizzle ORM v1 with binary ULIDs`})},{depth:2,url:`#effect-v4-services-with-typeid`,title:(0,l.jsx)(l.Fragment,{children:`Effect v4 services with TypeID`})}];function O(e){let t={code:`code`,h2:`h2`,p:`p`,...e.components};return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)(t.p,{children:[`These examples are the complete, executable files from the `,(0,l.jsx)(t.code,{children:`uniku`}),` repository. Clone the repository and run `,(0,l.jsx)(t.code,{children:`pnpm examples:check`}),` to typecheck and execute all three.`]}),`
`,(0,l.jsx)(t.h2,{id:`hono-request-ids-with-nanoid`,children:`Hono request IDs with Nanoid`}),`
`,(0,l.jsxs)(t.p,{children:[`Hono's request ID middleware accepts a synchronous `,(0,l.jsx)(t.code,{children:`generator`}),`. When a request does not already carry a valid `,(0,l.jsx)(t.code,{children:`X-Request-Id`}),` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header.`]}),`
`,(0,l.jsx)(b,{lang:`ts`,code:C,codeblock:{title:`hono-nanoid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:hono`}),`.`]}),`
`,(0,l.jsx)(t.h2,{id:`drizzle-orm-v1-with-binary-ulids`,children:`Drizzle ORM v1 with binary ULIDs`}),`
`,(0,l.jsxs)(t.p,{children:[`Drizzle ORM v1 provides a PostgreSQL `,(0,l.jsx)(t.code,{children:`bytea()`}),` column. `,(0,l.jsx)(t.code,{children:`ulid.toBytes()`}),` produces the canonical 16-byte representation; `,(0,l.jsx)(t.code,{children:`Buffer.from()`}),` adapts those bytes to Drizzle's PostgreSQL insert type. The selected value remains compatible with `,(0,l.jsx)(t.code,{children:`ulid.fromBytes()`}),`.`]}),`
`,(0,l.jsx)(t.p,{children:`The example uses an in-memory PGlite database, so it needs no external PostgreSQL server. It creates a table, inserts one event, reads the returned binary ID, and restores the canonical ULID string.`}),`
`,(0,l.jsx)(b,{lang:`ts`,code:x,codeblock:{title:`drizzle-ulid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:drizzle`}),`.`]}),`
`,(0,l.jsxs)(t.p,{children:[`:::note
The example pins Drizzle ORM `,(0,l.jsx)(t.code,{children:`1.0.0-rc.4`}),`. The v1 line is still a release candidate, so check its release notes before changing that version.
:::`]}),`
`,(0,l.jsx)(t.h2,{id:`effect-v4-services-with-typeid`,children:`Effect v4 services with TypeID`}),`
`,(0,l.jsxs)(t.p,{children:[`An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced `,(0,l.jsx)(t.code,{children:`next()`}),` effect and returns TypeID strings with a stable `,(0,l.jsx)(t.code,{children:`user_`}),` prefix.`]}),`
`,(0,l.jsx)(b,{lang:`ts`,code:S,codeblock:{title:`effect-typeid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:effect`}),`.`]}),`
`,(0,l.jsxs)(t.p,{children:[`:::note
This example uses the same exact Effect v4 beta as the `,(0,l.jsx)(t.code,{children:`uniku`}),` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin.
:::`]})]})}function k(e={}){let{wrapper:t}=e.components||{};return t?(0,l.jsx)(t,{...e,children:(0,l.jsx)(O,{...e})}):O(e)}export{T as _markdown,k as default,w as frontmatter,E as structuredData,D as toc};