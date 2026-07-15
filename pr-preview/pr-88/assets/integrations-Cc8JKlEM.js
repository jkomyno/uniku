const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/core-CwerC1OO.js","assets/dist-BspzPu9X.js","assets/index-DGVCxvGr.js","assets/rolldown-runtime-QTnfLwEv.js","assets/createLucideIcon-BUKHJUio.js","assets/dist-WyagwRHs.js","assets/jsx-runtime-By8HlURe.js","assets/dist-oX86Zc4A.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{n as t}from"./createLucideIcon-BUKHJUio.js";import{_ as n}from"./dist-WyagwRHs.js";import{t as r}from"./jsx-runtime-By8HlURe.js";import{F as i,a,i as o,v as s}from"./index-DGVCxvGr.js";var c=e(t(),1),l=e(r(),1);async function u(e,t){let n=e.getBundledThemes(),r=t.filter(t=>{if(typeof t==`string`&&!(t in n))return!1;try{return e.getTheme(t),!1}catch{return!0}});r.length>0&&await e.loadTheme(...r)}function d(e){return`theme`in e?[e.theme]:Object.values(e.themes).filter(e=>e!==void 0)}function f(e){let t;return{init(n){return t=e.init(n)},getOrInit(){return t??this.init()}}}async function p(e,t,n){let{fallbackLanguage:r=`text`,...a}=n,{isSpecialLang:o}=await i(async()=>{let{isSpecialLang:e}=await import(`./core-CwerC1OO.js`);return{isSpecialLang:e}},__vite__mapDeps([0,1,2,3,4,5,6]));return!o(a.lang)&&!(a.lang in e.getBundledLanguages())&&!e.getLoadedLanguages().includes(a.lang)&&(a.lang=r),await Promise.all([u(e,d(a)),e.loadLanguage(a.lang)]),e.codeToHast(t,a)}function m(e,t,n,r){let[i,a]=(0,c.useState)(n.defaultValue),o=(0,c.useRef)(null);return(0,c.useEffect)(()=>{async function r(){return s(await p(typeof e==`function`?await e():e,t,n),{...l,components:n.components})}let i=r();return o.current=i,i.then(e=>{o.current===i&&a(e)}),()=>{o.current=null}},r),i}var h=(0,c.createContext)(void 0);function g(e){let t=(0,c.use)(h);return(0,l.jsx)(o,{...e,...t,className:n(`my-0`,e.className,t?.className),children:(0,l.jsx)(a,{children:e.children})})}function _({lang:e,code:t,codeblock:n,options:r,wrapInSuspense:i=!0,highlighter:a}){let o=(0,c.useId)(),s={lang:e,defaultColor:!1,...r,components:{pre:g,...r.components}},u=m(a,t,s,[o,e,t]);return i&&(u??=(0,l.jsx)(v,{code:t,components:s.components})),(0,l.jsx)(h,{value:n,children:u})}function v({code:e,components:t={}}){let{pre:n=`pre`,code:r=`code`}=t;return(0,l.jsx)(n,{children:(0,l.jsx)(r,{children:e.split(`
`).map((e,t)=>(0,l.jsx)(`span`,{className:`line`,children:e},t))})})}var y=f({async init(e){let{createHighlighter:t,createJavaScriptRegexEngine:n}=await i(async()=>{let{createHighlighter:e,createJavaScriptRegexEngine:t}=await import(`./dist-oX86Zc4A.js`);return{createHighlighter:e,createJavaScriptRegexEngine:t}},__vite__mapDeps([7,3,2,4,5,6,1]));return t({langs:[],themes:[],langAlias:e?.langAlias,engine:n()})}});function b(e){return(0,l.jsx)(_,{highlighter:()=>y.getOrInit(),options:{themes:{light:`github-light`,dark:`github-dark`}},...e})}var x=`import { expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { customType, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { ulid } from 'uniku/ulid'

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
})

const events = pgTable('events', {
  id: bytea()
    .primaryKey()
    .$defaultFn(() => ulid.toBytes(ulid())),
  name: text().notNull(),
})

test('generates and stores a binary ULID with Drizzle', async () => {
  const client = new PGlite()
  const db = drizzle({ client })

  try {
    await db.execute(sql\`
      create table events (
        id bytea primary key,
        name text not null
      )
    \`)

    const [event] = await db.insert(events).values({ name: 'account.created' }).returning()

    if (!event) throw new Error('The inserted event was not returned')

    const restoredId = ulid.fromBytes(event.id)

    expect(event.id).toBeInstanceOf(Uint8Array)
    expect(event.id).toHaveLength(16)
    expect(ulid.isValid(restoredId)).toBe(true)
    expect(event.name).toBe('account.created')
  } finally {
    await client.close()
  }
})
`,S=`import { expect, test } from 'bun:test'
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

test('generates a prefixed TypeID through an Effect service', () => {
  const userId = Effect.runSync(program.pipe(Effect.provide(UserIds.layer)))

  expect(typeid.isValid(userId)).toBe(true)
  expect(typeid.prefix(userId)).toBe('user')
})
`,C=`import { expect, test } from 'bun:test'
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

test('uses a Nanoid as the Hono request ID', async () => {
  const response = await app.request('/')
  const body: unknown = await response.json()

  expect(body).toEqual({ requestId: expect.any(String) })

  if (!body || typeof body !== 'object' || !('requestId' in body) || typeof body.requestId !== 'string') {
    throw new Error('Hono did not return a request ID')
  }

  expect(nanoid.isValid(body.requestId)).toBe(true)
  expect(response.headers.get('X-Request-Id')).toBe(body.requestId)
})
`,w={title:`Integrations`,description:`Runnable starting points for Hono, Drizzle ORM v1, and Effect v4.`,icon:`Blocks`},T=`



These examples are the complete Bun test files from the \`uniku\` repository. Clone the repository and run \`pnpm examples:check\` to typecheck and execute all three with the Bun version pinned in \`mise.toml\`.

## Hono request IDs with Nanoid [#hono-request-ids-with-nanoid]

Hono's request ID middleware accepts a synchronous \`generator\`. When a request does not already carry a valid \`X-Request-Id\` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header.

<DynamicCodeBlock lang="ts" code="honoNanoid" codeblock="{ title: 'hono-nanoid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:hono\`.

## Drizzle ORM v1 with binary ULIDs [#drizzle-orm-v1-with-binary-ulids]

\`ulid.toBytes()\` produces the canonical 16-byte representation as a runtime-neutral \`Uint8Array\`. Drizzle v1's built-in PostgreSQL \`bytea()\` type is Node.js-specific, so this example declares a small \`customType\` that maps \`bytea\` directly to \`Uint8Array\` instead.

The column's \`$defaultFn\` generates the binary ULID when an insert omits \`id\`. The example uses an in-memory PGlite database, so it needs no external PostgreSQL server; it inserts one event, reads the returned 16 bytes, and restores the canonical ULID string with \`ulid.fromBytes()\`.

<DynamicCodeBlock lang="ts" code="drizzleUlid" codeblock="{ title: 'drizzle-ulid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:drizzle\`.

<Callout type="info" title="Drizzle v1 release candidate">
  The example pins Drizzle ORM \`1.0.0-rc.4\`. The v1 line is still a release candidate, so check its release notes before changing that version.
</Callout>

## Effect v4 services with TypeID [#effect-v4-services-with-typeid]

An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced \`next()\` effect and returns TypeID strings with a stable \`user_\` prefix.

<DynamicCodeBlock lang="ts" code="effectTypeid" codeblock="{ title: 'effect-typeid.ts' }" />

Run it with \`pnpm --filter @uniku/examples example:effect\`.

<Callout type="info" title="Effect v4 prerelease">
  This example uses the same exact Effect v4 beta as the \`uniku\` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin.
</Callout>
`,E={contents:[{heading:void 0,content:"These examples are the complete Bun test files from the `uniku` repository. Clone the repository and run `pnpm examples:check` to typecheck and execute all three with the Bun version pinned in `mise.toml`."},{heading:`hono-request-ids-with-nanoid`,content:"Hono's request ID middleware accepts a synchronous `generator`. When a request does not already carry a valid `X-Request-Id` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header."},{heading:`hono-request-ids-with-nanoid`,content:"Run it with `pnpm --filter @uniku/examples example:hono`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"`ulid.toBytes()` produces the canonical 16-byte representation as a runtime-neutral `Uint8Array`. Drizzle v1's built-in PostgreSQL `bytea()` type is Node.js-specific, so this example declares a small `customType` that maps `bytea` directly to `Uint8Array` instead."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"The column's `$defaultFn` generates the binary ULID when an insert omits `id`. The example uses an in-memory PGlite database, so it needs no external PostgreSQL server; it inserts one event, reads the returned 16 bytes, and restores the canonical ULID string with `ulid.fromBytes()`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"Run it with `pnpm --filter @uniku/examples example:drizzle`."},{heading:`drizzle-orm-v1-with-binary-ulids`,content:"The example pins Drizzle ORM `1.0.0-rc.4`. The v1 line is still a release candidate, so check its release notes before changing that version."},{heading:`effect-v4-services-with-typeid`,content:"An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced `next()` effect and returns TypeID strings with a stable `user_` prefix."},{heading:`effect-v4-services-with-typeid`,content:"Run it with `pnpm --filter @uniku/examples example:effect`."},{heading:`effect-v4-services-with-typeid`,content:"This example uses the same exact Effect v4 beta as the `uniku` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin."}],headings:[{id:`hono-request-ids-with-nanoid`,content:`Hono request IDs with Nanoid`},{id:`drizzle-orm-v1-with-binary-ulids`,content:`Drizzle ORM v1 with binary ULIDs`},{id:`effect-v4-services-with-typeid`,content:`Effect v4 services with TypeID`}]},D=[{depth:2,url:`#hono-request-ids-with-nanoid`,title:(0,l.jsx)(l.Fragment,{children:`Hono request IDs with Nanoid`})},{depth:2,url:`#drizzle-orm-v1-with-binary-ulids`,title:(0,l.jsx)(l.Fragment,{children:`Drizzle ORM v1 with binary ULIDs`})},{depth:2,url:`#effect-v4-services-with-typeid`,title:(0,l.jsx)(l.Fragment,{children:`Effect v4 services with TypeID`})}];function O(e){let t={code:`code`,h2:`h2`,p:`p`,...e.components},{Callout:n}=t;return n||A(`Callout`,!0),(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)(t.p,{children:[`These examples are the complete Bun test files from the `,(0,l.jsx)(t.code,{children:`uniku`}),` repository. Clone the repository and run `,(0,l.jsx)(t.code,{children:`pnpm examples:check`}),` to typecheck and execute all three with the Bun version pinned in `,(0,l.jsx)(t.code,{children:`mise.toml`}),`.`]}),`
`,(0,l.jsx)(t.h2,{id:`hono-request-ids-with-nanoid`,children:`Hono request IDs with Nanoid`}),`
`,(0,l.jsxs)(t.p,{children:[`Hono's request ID middleware accepts a synchronous `,(0,l.jsx)(t.code,{children:`generator`}),`. When a request does not already carry a valid `,(0,l.jsx)(t.code,{children:`X-Request-Id`}),` header, this example generates a compact Nanoid, stores it in the request context, and returns it in the response header.`]}),`
`,(0,l.jsx)(b,{lang:`ts`,code:C,codeblock:{title:`hono-nanoid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:hono`}),`.`]}),`
`,(0,l.jsx)(t.h2,{id:`drizzle-orm-v1-with-binary-ulids`,children:`Drizzle ORM v1 with binary ULIDs`}),`
`,(0,l.jsxs)(t.p,{children:[(0,l.jsx)(t.code,{children:`ulid.toBytes()`}),` produces the canonical 16-byte representation as a runtime-neutral `,(0,l.jsx)(t.code,{children:`Uint8Array`}),`. Drizzle v1's built-in PostgreSQL `,(0,l.jsx)(t.code,{children:`bytea()`}),` type is Node.js-specific, so this example declares a small `,(0,l.jsx)(t.code,{children:`customType`}),` that maps `,(0,l.jsx)(t.code,{children:`bytea`}),` directly to `,(0,l.jsx)(t.code,{children:`Uint8Array`}),` instead.`]}),`
`,(0,l.jsxs)(t.p,{children:[`The column's `,(0,l.jsx)(t.code,{children:`$defaultFn`}),` generates the binary ULID when an insert omits `,(0,l.jsx)(t.code,{children:`id`}),`. The example uses an in-memory PGlite database, so it needs no external PostgreSQL server; it inserts one event, reads the returned 16 bytes, and restores the canonical ULID string with `,(0,l.jsx)(t.code,{children:`ulid.fromBytes()`}),`.`]}),`
`,(0,l.jsx)(b,{lang:`ts`,code:x,codeblock:{title:`drizzle-ulid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:drizzle`}),`.`]}),`
`,(0,l.jsx)(n,{type:`info`,title:`Drizzle v1 release candidate`,children:(0,l.jsxs)(t.p,{children:[`The example pins Drizzle ORM `,(0,l.jsx)(t.code,{children:`1.0.0-rc.4`}),`. The v1 line is still a release candidate, so check its release notes before changing that version.`]})}),`
`,(0,l.jsx)(t.h2,{id:`effect-v4-services-with-typeid`,children:`Effect v4 services with TypeID`}),`
`,(0,l.jsxs)(t.p,{children:[`An Effect service keeps ID generation injectable without leaking framework types into the generated value. This service exposes a traced `,(0,l.jsx)(t.code,{children:`next()`}),` effect and returns TypeID strings with a stable `,(0,l.jsx)(t.code,{children:`user_`}),` prefix.`]}),`
`,(0,l.jsx)(b,{lang:`ts`,code:S,codeblock:{title:`effect-typeid.ts`}}),`
`,(0,l.jsxs)(t.p,{children:[`Run it with `,(0,l.jsx)(t.code,{children:`pnpm --filter @uniku/examples example:effect`}),`.`]}),`
`,(0,l.jsx)(n,{type:`info`,title:`Effect v4 prerelease`,children:(0,l.jsxs)(t.p,{children:[`This example uses the same exact Effect v4 beta as the `,(0,l.jsx)(t.code,{children:`uniku`}),` CLI. Effect v4 is still prerelease software, so keep the example aligned with the workspace pin.`]})})]})}function k(e={}){let{wrapper:t}=e.components||{};return t?(0,l.jsx)(t,{...e,children:(0,l.jsx)(O,{...e})}):O(e)}function A(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{T as _markdown,k as default,w as frontmatter,E as structuredData,D as toc};