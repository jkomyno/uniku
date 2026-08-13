import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{t}from"./jsx-runtime-By8HlURe.js";var n=e(t()),r={title:`Entry points`,description:`Ten stable generator entry points behind one consistent, type-safe API.`,icon:`Braces`},i=`

\`uniku\` exposes ten ID generation modules. Each module exports a callable generator with attached helpers. The most common public API looks like this:

\`\`\`ts
import { uuidv7 } from 'uniku/uuid/v7'

const id = uuidv7()
// e.g. '019f5732-0342-75f9-9efd-fc3c1f8da7fd'

uuidv7.isValid(id)
// true

const bytes = uuidv7.toBytes(id)
// Uint8Array(16)

uuidv7.fromBytes(bytes)
// the same value as \`id\`

uuidv7.timestamp(id)
// e.g. 1783874323266

uuidv7.NIL
// '00000000-0000-0000-0000-000000000000'

uuidv7.MAX
// 'ffffffff-ffff-ffff-ffff-ffffffffffff'
\`\`\`

Binary modules can also write directly into a caller-owned buffer:

\`\`\`ts
const destination = new Uint8Array(24)
const result = uuidv7(undefined, destination, 8)
// Uint8Array(24), with UUID bytes at offsets 8 through 23

result === destination
// true
\`\`\`

## How modules differ [#how-modules-differ]

<PublicApiOverview />

This table is derived from the generated TypeScript API reference. Open a module's page for complete signatures, options, constants, and examples.

The package root is intentionally not exported, so import a generator or metadata module directly. Two metadata entry points round out the library:

| Import             | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| \`uniku/errors\`     | Typed, machine-readable input, parse, and buffer errors. |
| \`uniku/generators\` | The canonical ordered list of supported generator kinds. |

## Generator references [#generator-references]

Read the reference for the module you use. Each Public API section is generated from the TypeScript signatures and JSDoc in \`packages/uniku/src\`, so it stays aligned with the library source.

<Cards>
  <Card title="UUID v4" href="/docs/reference/uuid-v4" description="Random, standards-compatible UUIDs." />

  <Card title="UUID v7" href="/docs/reference/uuid-v7" description="Time-ordered UUIDs for primary keys." />

  <Card title="ULID" href="/docs/reference/ulid" description="Sortable, URL-safe identifiers." />

  <Card title="TypeID" href="/docs/reference/typeid" description="UUID v7 values with readable type prefixes." />

  <Card title="CUID v2" href="/docs/reference/cuid-v2" description="Non-sequential identifiers that resist enumeration." />

  <Card title="Nanoid" href="/docs/reference/nanoid" description="Compact URL-safe identifiers." />

  <Card title="KSUID" href="/docs/reference/ksuid" description="High-entropy, time-ordered identifiers." />

  <Card title="ObjectID" href="/docs/reference/objectid" description="MongoDB-compatible identifiers." />

  <Card title="XID" href="/docs/reference/xid" description="Compact identifiers compatible with rs/xid." />

  <Card title="TSID" href="/docs/reference/tsid" description="Time-sorted bigint identifiers." />

  <Card title="Errors" href="/docs/reference/errors" description="Typed errors and the generator list." />
</Cards>
`,a={contents:[{heading:void 0,content:"`uniku` exposes ten ID generation modules. Each module exports a callable generator with attached helpers. The most common public API looks like this:"},{heading:void 0,content:`Binary modules can also write directly into a caller-owned buffer:`},{heading:`how-modules-differ`,content:`This table is derived from the generated TypeScript API reference. Open a module's page for complete signatures, options, constants, and examples.`},{heading:`how-modules-differ`,content:`The package root is intentionally not exported, so import a generator or metadata module directly. Two metadata entry points round out the library:`},{heading:`how-modules-differ`,content:`Import`},{heading:`how-modules-differ`,content:`Purpose`},{heading:`how-modules-differ`,content:"`uniku/errors`"},{heading:`how-modules-differ`,content:`Typed, machine-readable input, parse, and buffer errors.`},{heading:`how-modules-differ`,content:"`uniku/generators`"},{heading:`how-modules-differ`,content:`The canonical ordered list of supported generator kinds.`},{heading:`generator-references`,content:"Read the reference for the module you use. Each Public API section is generated from the TypeScript signatures and JSDoc in `packages/uniku/src`, so it stays aligned with the library source."},{heading:`generator-references`,content:`<Card title="UUID v4" href="/docs/reference/uuid-v4" description="Random, standards-compatible UUIDs." />`},{heading:`generator-references`,content:`<Card title="UUID v7" href="/docs/reference/uuid-v7" description="Time-ordered UUIDs for primary keys." />`},{heading:`generator-references`,content:`<Card title="ULID" href="/docs/reference/ulid" description="Sortable, URL-safe identifiers." />`},{heading:`generator-references`,content:`<Card title="TypeID" href="/docs/reference/typeid" description="UUID v7 values with readable type prefixes." />`},{heading:`generator-references`,content:`<Card title="CUID v2" href="/docs/reference/cuid-v2" description="Non-sequential identifiers that resist enumeration." />`},{heading:`generator-references`,content:`<Card title="Nanoid" href="/docs/reference/nanoid" description="Compact URL-safe identifiers." />`},{heading:`generator-references`,content:`<Card title="KSUID" href="/docs/reference/ksuid" description="High-entropy, time-ordered identifiers." />`},{heading:`generator-references`,content:`<Card title="ObjectID" href="/docs/reference/objectid" description="MongoDB-compatible identifiers." />`},{heading:`generator-references`,content:`<Card title="XID" href="/docs/reference/xid" description="Compact identifiers compatible with rs/xid." />`},{heading:`generator-references`,content:`<Card title="TSID" href="/docs/reference/tsid" description="Time-sorted bigint identifiers." />`},{heading:`generator-references`,content:`<Card title="Errors" href="/docs/reference/errors" description="Typed errors and the generator list." />`}],headings:[{id:`how-modules-differ`,content:`How modules differ`},{id:`generator-references`,content:`Generator references`}]},o=[{depth:2,url:`#how-modules-differ`,title:(0,n.jsx)(n.Fragment,{children:`How modules differ`})},{depth:2,url:`#generator-references`,title:(0,n.jsx)(n.Fragment,{children:`Generator references`})}];function s(e){let t={code:`code`,h2:`h2`,p:`p`,pre:`pre`,span:`span`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,...e.components},{Card:r,Cards:i,PublicApiOverview:a}=t;return r||l(`Card`,!0),i||l(`Cards`,!0),a||l(`PublicApiOverview`,!0),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.code,{children:`uniku`}),` exposes ten ID generation modules. Each module exports a callable generator with attached helpers. The most common public API looks like this:`]}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` { uuidv7 } `}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 'uniku/uuid/v7'`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` id`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` uuidv7`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`()`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// e.g. '019f5732-0342-75f9-9efd-fc3c1f8da7fd'`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`isValid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(id)`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// true`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` bytes`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`toBytes`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(id)`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// Uint8Array(16)`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`fromBytes`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(bytes)`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:"// the same value as `id`"})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(id)`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// e.g. 1783874323266`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`NIL`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// '00000000-0000-0000-0000-000000000000'`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`uuidv7.`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`MAX`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// 'ffffffff-ffff-ffff-ffff-ffffffffffff'`})})]})})}),`
`,(0,n.jsx)(t.p,{children:`Binary modules can also write directly into a caller-owned buffer:`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` destination`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` Uint8Array`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`24`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`)`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`const`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` result`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` uuidv7`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`undefined`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, destination, `}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`8`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`)`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// Uint8Array(24), with UUID bytes at offsets 8 through 23`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`result `}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`===`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` destination`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// true`})})]})})}),`
`,(0,n.jsx)(t.h2,{id:`how-modules-differ`,children:`How modules differ`}),`
`,(0,n.jsx)(a,{}),`
`,(0,n.jsx)(t.p,{children:`This table is derived from the generated TypeScript API reference. Open a module's page for complete signatures, options, constants, and examples.`}),`
`,(0,n.jsx)(t.p,{children:`The package root is intentionally not exported, so import a generator or metadata module directly. Two metadata entry points round out the library:`}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Import`}),(0,n.jsx)(t.th,{children:`Purpose`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/errors`})}),(0,n.jsx)(t.td,{children:`Typed, machine-readable input, parse, and buffer errors.`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`uniku/generators`})}),(0,n.jsx)(t.td,{children:`The canonical ordered list of supported generator kinds.`})]})]})]}),`
`,(0,n.jsx)(t.h2,{id:`generator-references`,children:`Generator references`}),`
`,(0,n.jsxs)(t.p,{children:[`Read the reference for the module you use. Each Public API section is generated from the TypeScript signatures and JSDoc in `,(0,n.jsx)(t.code,{children:`packages/uniku/src`}),`, so it stays aligned with the library source.`]}),`
`,(0,n.jsxs)(i,{children:[(0,n.jsx)(r,{title:`UUID v4`,href:`/docs/reference/uuid-v4`,description:`Random, standards-compatible UUIDs.`}),(0,n.jsx)(r,{title:`UUID v7`,href:`/docs/reference/uuid-v7`,description:`Time-ordered UUIDs for primary keys.`}),(0,n.jsx)(r,{title:`ULID`,href:`/docs/reference/ulid`,description:`Sortable, URL-safe identifiers.`}),(0,n.jsx)(r,{title:`TypeID`,href:`/docs/reference/typeid`,description:`UUID v7 values with readable type prefixes.`}),(0,n.jsx)(r,{title:`CUID v2`,href:`/docs/reference/cuid-v2`,description:`Non-sequential identifiers that resist enumeration.`}),(0,n.jsx)(r,{title:`Nanoid`,href:`/docs/reference/nanoid`,description:`Compact URL-safe identifiers.`}),(0,n.jsx)(r,{title:`KSUID`,href:`/docs/reference/ksuid`,description:`High-entropy, time-ordered identifiers.`}),(0,n.jsx)(r,{title:`ObjectID`,href:`/docs/reference/objectid`,description:`MongoDB-compatible identifiers.`}),(0,n.jsx)(r,{title:`XID`,href:`/docs/reference/xid`,description:`Compact identifiers compatible with rs/xid.`}),(0,n.jsx)(r,{title:`TSID`,href:`/docs/reference/tsid`,description:`Time-sorted bigint identifiers.`}),(0,n.jsx)(r,{title:`Errors`,href:`/docs/reference/errors`,description:`Typed errors and the generator list.`})]})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}function l(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};