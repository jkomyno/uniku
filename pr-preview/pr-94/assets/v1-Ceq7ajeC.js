import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{t}from"./jsx-runtime-By8HlURe.js";var n=e(t()),r={title:`Migrate to uniku v1`,description:`Prepare for the v1 entry-point contract without changing identifier data.`,icon:`Milestone`},i=`

uniku v1 keeps its public generator entry points stable and removes one pre-v1 compatibility alias.

## Move CUID v2 to the versioned entry point [#move-cuid-v2-to-the-versioned-entry-point]

\`uniku/cuid2\` is a pre-v1 alias. Use the canonical versioned import before upgrading:

\`\`\`diff
- import { cuid2 } from 'uniku/cuid2'
+ import { cuidv2 } from 'uniku/cuid/v2'
\`\`\`

The generator behavior is the same. This is an import migration, not a data migration: existing CUID v2 values remain valid.

## What remains stable [#what-remains-stable]

Within \`1.x\`, uniku will not remove or rename documented entry points, exports, options, methods, or constants. Canonical string formats, byte order, timestamp units, and documented error codes are part of the contract.

Read the [stability contract](https://github.com/jkomyno/uniku/blob/main/docs/STABILITY.md) for the full release and runtime policy.
`,a={contents:[{heading:void 0,content:`uniku v1 keeps its public generator entry points stable and removes one pre-v1 compatibility alias.`},{heading:`move-cuid-v2-to-the-versioned-entry-point`,content:"`uniku/cuid2` is a pre-v1 alias. Use the canonical versioned import before upgrading:"},{heading:`move-cuid-v2-to-the-versioned-entry-point`,content:`The generator behavior is the same. This is an import migration, not a data migration: existing CUID v2 values remain valid.`},{heading:`what-remains-stable`,content:"Within `1.x`, uniku will not remove or rename documented entry points, exports, options, methods, or constants. Canonical string formats, byte order, timestamp units, and documented error codes are part of the contract."},{heading:`what-remains-stable`,content:`Read the stability contract for the full release and runtime policy.`}],headings:[{id:`move-cuid-v2-to-the-versioned-entry-point`,content:`Move CUID v2 to the versioned entry point`},{id:`what-remains-stable`,content:`What remains stable`}]},o=[{depth:2,url:`#move-cuid-v2-to-the-versioned-entry-point`,title:(0,n.jsx)(n.Fragment,{children:`Move CUID v2 to the versioned entry point`})},{depth:2,url:`#what-remains-stable`,title:(0,n.jsx)(n.Fragment,{children:`What remains stable`})}];function s(e){let t={a:`a`,code:`code`,h2:`h2`,p:`p`,pre:`pre`,span:`span`,...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.p,{children:`uniku v1 keeps its public generator entry points stable and removes one pre-v1 compatibility alias.`}),`
`,(0,n.jsx)(t.h2,{id:`move-cuid-v2-to-the-versioned-entry-point`,children:`Move CUID v2 to the versioned entry point`}),`
`,(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.code,{children:`uniku/cuid2`}),` is a pre-v1 alias. Use the canonical versioned import before upgrading:`]}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="M 6,1 C 4.354992,1 3,2.354992 3,4 v 16 c 0,1.645008 1.354992,3 3,3 h 12 c 1.645008,0 3,-1.354992 3,-3 V 8 7 A 1.0001,1.0001 0 0 0 20.707031,6.2929687 l -5,-5 A 1.0001,1.0001 0 0 0 15,1 h -1 z m 0,2 h 7 v 3 c 0,1.645008 1.354992,3 3,3 h 3 v 11 c 0,0.564129 -0.435871,1 -1,1 H 6 C 5.4358712,21 5,20.564129 5,20 V 4 C 5,3.4358712 5.4358712,3 6,3 Z M 15,3.4140625 18.585937,7 H 16 C 15.435871,7 15,6.5641288 15,6 Z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#B31D28`,"--shiki-dark":`#FDAEB7`},children:`- import { cuid2 } from 'uniku/cuid2'`})}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#22863A`,"--shiki-dark":`#85E89D`},children:`+ import { cuidv2 } from 'uniku/cuid/v2'`})})]})})}),`
`,(0,n.jsx)(t.p,{children:`The generator behavior is the same. This is an import migration, not a data migration: existing CUID v2 values remain valid.`}),`
`,(0,n.jsx)(t.h2,{id:`what-remains-stable`,children:`What remains stable`}),`
`,(0,n.jsxs)(t.p,{children:[`Within `,(0,n.jsx)(t.code,{children:`1.x`}),`, uniku will not remove or rename documented entry points, exports, options, methods, or constants. Canonical string formats, byte order, timestamp units, and documented error codes are part of the contract.`]}),`
`,(0,n.jsxs)(t.p,{children:[`Read the `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/blob/main/docs/STABILITY.md`,children:`stability contract`}),` for the full release and runtime policy.`]})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};