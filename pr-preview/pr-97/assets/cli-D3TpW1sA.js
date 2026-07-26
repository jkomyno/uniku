import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{t}from"./jsx-runtime-By8HlURe.js";var n=e(t()),r={title:`CLI companion`,description:`Generate, inspect, and validate IDs from the terminal.`,icon:`Terminal`},i=`

\`@uniku/cli\` is the command-line companion to the library. It is useful when an ID belongs in a shell pipeline, a migration, or a one-off diagnostic instead of your application source. It supports every generator in the library: UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, MongoDB ObjectID, XID, and TSID.

## Install [#install]

<CodeBlockTabs defaultValue="npm">
  <CodeBlockTabsList>
    <CodeBlockTabsTrigger value="npm">
      npm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="pnpm">
      pnpm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="bun">
      bun
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="mise">
      mise
    </CodeBlockTabsTrigger>
  </CodeBlockTabsList>

  <CodeBlockTab value="npm">
    \`\`\`sh
    npm install -g @uniku/cli
    \`\`\`
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    \`\`\`sh
    pnpm add -g @uniku/cli
    \`\`\`
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    \`\`\`sh
    bun add -g @uniku/cli
    \`\`\`
  </CodeBlockTab>

  <CodeBlockTab value="mise">
    Installs the current standalone binary without requiring Node.js:

    \`\`\`sh
    mise use -g github:jkomyno/uniku
    \`\`\`

    Add an explicit version from the [GitHub releases page](https://github.com/jkomyno/uniku/releases) when a project or CI job must stay pinned.
  </CodeBlockTab>
</CodeBlockTabs>

A standalone binary (no Node.js required) is also available for macOS and Linux:

\`\`\`sh
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | sh
\`\`\`

The installer resolves the latest CLI release automatically. Set \`UNIKU_INSTALL_DIR\` to choose a destination:

\`\`\`sh
curl -fsSL https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh | UNIKU_INSTALL_DIR="$HOME/.local/bin" sh
\`\`\`

For an exact pin, set \`UNIKU_VERSION\` to a version from the [GitHub releases page](https://github.com/jkomyno/uniku/releases), without the \`uniku-cli-v\` tag prefix.

## Generate [#generate]

Every generator has a top-level shorthand (\`uniku uuid\`) that is equivalent to \`uniku generate uuid\`. Every generate command accepts these two options in addition to its own:

| Option    | Alias | Description                                       |
| --------- | ----- | ------------------------------------------------- |
| \`--count\` | \`-n\`  | Number of IDs to generate (default: \`1\`)          |
| \`--json\`  |       | Output as a JSON array instead of one ID per line |

### uuid [#uuid]

Generate UUIDs (v4 or v7).

\`\`\`sh
uniku uuid
# 550e8400-e29b-41d4-a716-446655440000

uniku uuid -v 7
# 018e5e5c-7c8a-7000-8000-000000000000

uniku uuid -n 5 --json
\`\`\`

| Option           | Alias | Description                             |
| ---------------- | ----- | --------------------------------------- |
| \`--uuid-version\` | \`-v\`  | UUID version: \`4\` or \`7\` (default: \`4\`) |
| \`--lowercase\`    |       | Output in lowercase                     |

### ulid [#ulid]

Generate ULIDs.

\`\`\`sh
uniku ulid
# 01HW9T2W9W9YJ3JZ1H4P4M2T8Q

uniku ulid -n 10 --monotonic --json
# 10 strictly ordered ULIDs, as a JSON array

uniku ulid --timestamp 1720000000000
# a ULID for a fixed Unix timestamp (ms)
\`\`\`

| Option        | Description                              |
| ------------- | ---------------------------------------- |
| \`--monotonic\` | Generate monotonically increasing ULIDs  |
| \`--timestamp\` | Unix timestamp in milliseconds, or \`now\` |
| \`--lowercase\` | Output in lowercase                      |

### typeid [#typeid]

Generate TypeIDs: a UUID v7 with a type prefix.

\`\`\`sh
uniku typeid --prefix user
# user_01h2xcejqtf2nbrexx3vqjhp41

uniku typeid -p api_key -n 5 --json
# 5 api_key TypeIDs, as JSON

uniku typeid
# a canonical prefixless TypeID
\`\`\`

| Option     | Alias | Description                                                |
| ---------- | ----- | ---------------------------------------------------------- |
| \`--prefix\` | \`-p\`  | Type prefix, e.g. \`user\` for \`user_...\` (empty by default) |

### nanoid [#nanoid]

Generate Nanoids.

\`\`\`sh
uniku nanoid -n 5 --json

uniku nanoid --size 10 --alphabet hex
# a 10-char ID from the hex preset
\`\`\`

| Option       | Alias | Description                                          |
| ------------ | ----- | ---------------------------------------------------- |
| \`--size\`     | \`-s\`  | Length of the ID, 1-256 (default: \`21\`)              |
| \`--alphabet\` | \`-a\`  | Custom alphabet or preset: \`hex\`, \`numeric\`, \`alpha\` |

### cuid [#cuid]

Generate CUIDs (v2).

\`\`\`sh
uniku cuid -n 5 --json

uniku cuid --length 10
# a 10-char CUID
\`\`\`

| Option     | Alias | Description                            |
| ---------- | ----- | -------------------------------------- |
| \`--length\` | \`-l\`  | Length of the ID, 2-32 (default: \`24\`) |

### ksuid [#ksuid]

Generate KSUIDs.

\`\`\`sh
uniku ksuid -n 5 --json

uniku ksuid --timestamp 1720000000
# a KSUID for a fixed Unix timestamp (s)
\`\`\`

| Option        | Description                         |
| ------------- | ----------------------------------- |
| \`--timestamp\` | Unix timestamp in seconds, or \`now\` |

### objectid [#objectid]

Generate MongoDB ObjectIDs.

\`\`\`sh
uniku objectid
# 66e1a8d3f1c2b3a4d5e6f7a8

uniku objectid --timestamp 1720000000
# an ObjectID for a fixed Unix timestamp (s)
\`\`\`

### xid [#xid]

Generate XIDs compatible with rs/xid.

\`\`\`sh
uniku xid

uniku xid --timestamp 1720000000
# an XID for a fixed Unix timestamp (s)
\`\`\`

| Option        | Description                         |
| ------------- | ----------------------------------- |
| \`--timestamp\` | Unix timestamp in seconds, or \`now\` |

### tsid [#tsid]

Generate TSIDs: 64-bit Snowflake-style, time-sorted identifiers.

\`\`\`sh
uniku tsid
# 0QXW2CK4XZM2A

uniku tsid --timestamp 1720000000000
# a TSID for a fixed Unix timestamp (ms) — note: milliseconds, unlike ksuid/objectid's seconds

uniku tsid --node 42 --node-bits 10
# a TSID for a fixed node ID
\`\`\`

| Option        | Description                                         |
| ------------- | --------------------------------------------------- |
| \`--timestamp\` | Unix timestamp in milliseconds, or \`now\`            |
| \`--node\`      | Node ID (\`0\` to \`2^node-bits - 1\`)                  |
| \`--node-bits\` | Bits allocated to the node ID, 0-20 (default: \`10\`) |

## Inspect [#inspect]

Decode the metadata embedded in an ID: type, version, timestamp, and random component.

\`\`\`sh
uniku inspect 018e5e5c-7c8a-7000-8000-000000000000
uniku inspect --type ulid 01HW9T2W9W9YJ3JZ1H4P4M2T8Q
uniku inspect --json 018e5e5c-7c8a-7000-8000-000000000000

# an ID that starts with a dash needs \`--\` first
uniku inspect -- --tricky-id
\`\`\`

The type is auto-detected unless \`--type\` is given. For time-ordered IDs (UUID v7, ULID, TypeID, KSUID, ObjectID, XID, TSID), inspect extracts the embedded timestamp. Random-only IDs (UUID v4, CUID v2, Nanoid) report that no decodable metadata is available. Timestamp precision matches each generator: UUID v7, ULID, and TSID are millisecond-precision; KSUID, ObjectID, and XID are second-precision.

| Option   | Description                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| \`--type\` | ID type: \`uuid\`, \`ulid\`, \`typeid\`, \`nanoid\`, \`cuid\`, \`ksuid\`, \`objectid\`, \`xid\`, \`tsid\` (auto-detected if omitted) |
| \`--json\` | Output as JSON                                                                                                     |

## Validate [#validate]

Check whether an ID is well-formed, one at a time or in bulk from stdin.

\`\`\`sh
uniku validate 018e5e5c-7c8a-7000-8000-000000000000
uniku validate --type typeid user_01h2xcejqtf2nbrexx3vqjhp41

# batch validate, one ID per line
cat ids.txt | uniku validate --stdin --json

# exit code only: 0 = valid, 2 = invalid
uniku validate --quiet 018e5e5c-7c8a-7000-8000-000000000000
\`\`\`

| Option    | Description                                        |
| --------- | -------------------------------------------------- |
| \`--type\`  | Expected ID type (auto-detected if omitted)        |
| \`--stdin\` | Read IDs from stdin (one per line)                 |
| \`--quiet\` | No output, exit code only (\`0\` valid, \`2\` invalid) |
| \`--json\`  | Output as JSON                                     |

Use \`--json\` whenever the output feeds another program. The CLI and library publish independently: a library \`1.0.0\` release does not imply a CLI \`1.0.0\` release at the same time.
`,a={contents:[{heading:void 0,content:"`@uniku/cli` is the command-line companion to the library. It is useful when an ID belongs in a shell pipeline, a migration, or a one-off diagnostic instead of your application source. It supports every generator in the library: UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, MongoDB ObjectID, XID, and TSID."},{heading:`install`,content:`Installs the current standalone binary without requiring Node.js:`},{heading:`install`,content:`Add an explicit version from the GitHub releases page when a project or CI job must stay pinned.`},{heading:`install`,content:`A standalone binary (no Node.js required) is also available for macOS and Linux:`},{heading:`install`,content:"The installer resolves the latest CLI release automatically. Set `UNIKU_INSTALL_DIR` to choose a destination:"},{heading:`install`,content:"For an exact pin, set `UNIKU_VERSION` to a version from the GitHub releases page, without the `uniku-cli-v` tag prefix."},{heading:`generate`,content:"Every generator has a top-level shorthand (`uniku uuid`) that is equivalent to `uniku generate uuid`. Every generate command accepts these two options in addition to its own:"},{heading:`generate`,content:`Option`},{heading:`generate`,content:`Alias`},{heading:`generate`,content:`Description`},{heading:`generate`,content:"`--count`"},{heading:`generate`,content:"`-n`"},{heading:`generate`,content:"Number of IDs to generate (default: `1`)"},{heading:`generate`,content:"`--json`"},{heading:`generate`,content:`Output as a JSON array instead of one ID per line`},{heading:`uuid`,content:`Generate UUIDs (v4 or v7).`},{heading:`uuid`,content:`Option`},{heading:`uuid`,content:`Alias`},{heading:`uuid`,content:`Description`},{heading:`uuid`,content:"`--uuid-version`"},{heading:`uuid`,content:"`-v`"},{heading:`uuid`,content:"UUID version: `4` or `7` (default: `4`)"},{heading:`uuid`,content:"`--lowercase`"},{heading:`uuid`,content:`Output in lowercase`},{heading:`ulid`,content:`Generate ULIDs.`},{heading:`ulid`,content:`Option`},{heading:`ulid`,content:`Description`},{heading:`ulid`,content:"`--monotonic`"},{heading:`ulid`,content:`Generate monotonically increasing ULIDs`},{heading:`ulid`,content:"`--timestamp`"},{heading:`ulid`,content:"Unix timestamp in milliseconds, or `now`"},{heading:`ulid`,content:"`--lowercase`"},{heading:`ulid`,content:`Output in lowercase`},{heading:`typeid`,content:`Generate TypeIDs: a UUID v7 with a type prefix.`},{heading:`typeid`,content:`Option`},{heading:`typeid`,content:`Alias`},{heading:`typeid`,content:`Description`},{heading:`typeid`,content:"`--prefix`"},{heading:`typeid`,content:"`-p`"},{heading:`typeid`,content:"Type prefix, e.g. `user` for `user_...` (empty by default)"},{heading:`nanoid`,content:`Generate Nanoids.`},{heading:`nanoid`,content:`Option`},{heading:`nanoid`,content:`Alias`},{heading:`nanoid`,content:`Description`},{heading:`nanoid`,content:"`--size`"},{heading:`nanoid`,content:"`-s`"},{heading:`nanoid`,content:"Length of the ID, 1-256 (default: `21`)"},{heading:`nanoid`,content:"`--alphabet`"},{heading:`nanoid`,content:"`-a`"},{heading:`nanoid`,content:"Custom alphabet or preset: `hex`, `numeric`, `alpha`"},{heading:`cuid`,content:`Generate CUIDs (v2).`},{heading:`cuid`,content:`Option`},{heading:`cuid`,content:`Alias`},{heading:`cuid`,content:`Description`},{heading:`cuid`,content:"`--length`"},{heading:`cuid`,content:"`-l`"},{heading:`cuid`,content:"Length of the ID, 2-32 (default: `24`)"},{heading:`ksuid`,content:`Generate KSUIDs.`},{heading:`ksuid`,content:`Option`},{heading:`ksuid`,content:`Description`},{heading:`ksuid`,content:"`--timestamp`"},{heading:`ksuid`,content:"Unix timestamp in seconds, or `now`"},{heading:`objectid`,content:`Generate MongoDB ObjectIDs.`},{heading:`xid`,content:`Generate XIDs compatible with rs/xid.`},{heading:`xid`,content:`Option`},{heading:`xid`,content:`Description`},{heading:`xid`,content:"`--timestamp`"},{heading:`xid`,content:"Unix timestamp in seconds, or `now`"},{heading:`tsid`,content:`Generate TSIDs: 64-bit Snowflake-style, time-sorted identifiers.`},{heading:`tsid`,content:`Option`},{heading:`tsid`,content:`Description`},{heading:`tsid`,content:"`--timestamp`"},{heading:`tsid`,content:"Unix timestamp in milliseconds, or `now`"},{heading:`tsid`,content:"`--node`"},{heading:`tsid`,content:"Node ID (`0` to `2^node-bits - 1`)"},{heading:`tsid`,content:"`--node-bits`"},{heading:`tsid`,content:"Bits allocated to the node ID, 0-20 (default: `10`)"},{heading:`inspect`,content:`Decode the metadata embedded in an ID: type, version, timestamp, and random component.`},{heading:`inspect`,content:"The type is auto-detected unless `--type` is given. For time-ordered IDs (UUID v7, ULID, TypeID, KSUID, ObjectID, XID, TSID), inspect extracts the embedded timestamp. Random-only IDs (UUID v4, CUID v2, Nanoid) report that no decodable metadata is available. Timestamp precision matches each generator: UUID v7, ULID, and TSID are millisecond-precision; KSUID, ObjectID, and XID are second-precision."},{heading:`inspect`,content:`Option`},{heading:`inspect`,content:`Description`},{heading:`inspect`,content:"`--type`"},{heading:`inspect`,content:"ID type: `uuid`, `ulid`, `typeid`, `nanoid`, `cuid`, `ksuid`, `objectid`, `xid`, `tsid` (auto-detected if omitted)"},{heading:`inspect`,content:"`--json`"},{heading:`inspect`,content:`Output as JSON`},{heading:`validate`,content:`Check whether an ID is well-formed, one at a time or in bulk from stdin.`},{heading:`validate`,content:`Option`},{heading:`validate`,content:`Description`},{heading:`validate`,content:"`--type`"},{heading:`validate`,content:`Expected ID type (auto-detected if omitted)`},{heading:`validate`,content:"`--stdin`"},{heading:`validate`,content:`Read IDs from stdin (one per line)`},{heading:`validate`,content:"`--quiet`"},{heading:`validate`,content:"No output, exit code only (`0` valid, `2` invalid)"},{heading:`validate`,content:"`--json`"},{heading:`validate`,content:`Output as JSON`},{heading:`validate`,content:"Use `--json` whenever the output feeds another program. The CLI and library publish independently: a library `1.0.0` release does not imply a CLI `1.0.0` release at the same time."}],headings:[{id:`install`,content:`Install`},{id:`generate`,content:`Generate`},{id:`uuid`,content:`uuid`},{id:`ulid`,content:`ulid`},{id:`typeid`,content:`typeid`},{id:`nanoid`,content:`nanoid`},{id:`cuid`,content:`cuid`},{id:`ksuid`,content:`ksuid`},{id:`objectid`,content:`objectid`},{id:`xid`,content:`xid`},{id:`tsid`,content:`tsid`},{id:`inspect`,content:`Inspect`},{id:`validate`,content:`Validate`}]},o=[{depth:2,url:`#install`,title:(0,n.jsx)(n.Fragment,{children:`Install`})},{depth:2,url:`#generate`,title:(0,n.jsx)(n.Fragment,{children:`Generate`})},{depth:3,url:`#uuid`,title:(0,n.jsx)(n.Fragment,{children:`uuid`})},{depth:3,url:`#ulid`,title:(0,n.jsx)(n.Fragment,{children:`ulid`})},{depth:3,url:`#typeid`,title:(0,n.jsx)(n.Fragment,{children:`typeid`})},{depth:3,url:`#nanoid`,title:(0,n.jsx)(n.Fragment,{children:`nanoid`})},{depth:3,url:`#cuid`,title:(0,n.jsx)(n.Fragment,{children:`cuid`})},{depth:3,url:`#ksuid`,title:(0,n.jsx)(n.Fragment,{children:`ksuid`})},{depth:3,url:`#objectid`,title:(0,n.jsx)(n.Fragment,{children:`objectid`})},{depth:3,url:`#xid`,title:(0,n.jsx)(n.Fragment,{children:`xid`})},{depth:3,url:`#tsid`,title:(0,n.jsx)(n.Fragment,{children:`tsid`})},{depth:2,url:`#inspect`,title:(0,n.jsx)(n.Fragment,{children:`Inspect`})},{depth:2,url:`#validate`,title:(0,n.jsx)(n.Fragment,{children:`Validate`})}];function s(e){let t={a:`a`,code:`code`,h2:`h2`,h3:`h3`,p:`p`,pre:`pre`,span:`span`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,...e.components},{CodeBlockTab:r,CodeBlockTabs:i,CodeBlockTabsList:a,CodeBlockTabsTrigger:o}=t;return r||l(`CodeBlockTab`,!0),i||l(`CodeBlockTabs`,!0),a||l(`CodeBlockTabsList`,!0),o||l(`CodeBlockTabsTrigger`,!0),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)(t.p,{children:[(0,n.jsx)(t.code,{children:`@uniku/cli`}),` is the command-line companion to the library. It is useful when an ID belongs in a shell pipeline, a migration, or a one-off diagnostic instead of your application source. It supports every generator in the library: UUID v4/v7, ULID, TypeID, CUID v2, Nanoid, KSUID, MongoDB ObjectID, XID, and TSID.`]}),`
`,(0,n.jsx)(t.h2,{id:`install`,children:`Install`}),`
`,(0,n.jsxs)(i,{defaultValue:`npm`,children:[(0,n.jsxs)(a,{children:[(0,n.jsx)(o,{value:`npm`,children:`npm`}),(0,n.jsx)(o,{value:`pnpm`,children:`pnpm`}),(0,n.jsx)(o,{value:`bun`,children:`bun`}),(0,n.jsx)(o,{value:`mise`,children:`mise`})]}),(0,n.jsx)(r,{value:`npm`,children:(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`npm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` install`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -g`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` @uniku/cli`})]})})})})}),(0,n.jsx)(r,{value:`pnpm`,children:(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pnpm`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -g`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` @uniku/cli`})]})})})})}),(0,n.jsx)(r,{value:`bun`,children:(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`bun`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -g`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` @uniku/cli`})]})})})})}),(0,n.jsxs)(r,{value:`mise`,children:[(0,n.jsx)(t.p,{children:`Installs the current standalone binary without requiring Node.js:`}),(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`mise`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` use`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -g`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` github:jkomyno/uniku`})]})})})}),(0,n.jsxs)(t.p,{children:[`Add an explicit version from the `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/releases`,children:`GitHub releases page`}),` when a project or CI job must stay pinned.`]})]})]}),`
`,(0,n.jsx)(t.p,{children:`A standalone binary (no Node.js required) is also available for macOS and Linux:`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`curl`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -fsSL`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` |`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` sh`})]})})})}),`
`,(0,n.jsxs)(t.p,{children:[`The installer resolves the latest CLI release automatically. Set `,(0,n.jsx)(t.code,{children:`UNIKU_INSTALL_DIR`}),` to choose a destination:`]}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsx)(t.code,{children:(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`curl`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -fsSL`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` https://raw.githubusercontent.com/jkomyno/uniku/main/install.sh`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` |`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` UNIKU_INSTALL_DIR`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`$HOME`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`/.local/bin"`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` sh`})]})})})}),`
`,(0,n.jsxs)(t.p,{children:[`For an exact pin, set `,(0,n.jsx)(t.code,{children:`UNIKU_VERSION`}),` to a version from the `,(0,n.jsx)(t.a,{href:`https://github.com/jkomyno/uniku/releases`,children:`GitHub releases page`}),`, without the `,(0,n.jsx)(t.code,{children:`uniku-cli-v`}),` tag prefix.`]}),`
`,(0,n.jsx)(t.h2,{id:`generate`,children:`Generate`}),`
`,(0,n.jsxs)(t.p,{children:[`Every generator has a top-level shorthand (`,(0,n.jsx)(t.code,{children:`uniku uuid`}),`) that is equivalent to `,(0,n.jsx)(t.code,{children:`uniku generate uuid`}),`. Every generate command accepts these two options in addition to its own:`]}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Alias`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--count`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-n`})}),(0,n.jsxs)(t.td,{children:[`Number of IDs to generate (default: `,(0,n.jsx)(t.code,{children:`1`}),`)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--json`})}),(0,n.jsx)(t.td,{}),(0,n.jsx)(t.td,{children:`Output as a JSON array instead of one ID per line`})]})]})]}),`
`,(0,n.jsx)(t.h3,{id:`uuid`,children:`uuid`}),`
`,(0,n.jsx)(t.p,{children:`Generate UUIDs (v4 or v7).`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` uuid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 550e8400-e29b-41d4-a716-446655440000`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` uuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -v`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 7`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 018e5e5c-7c8a-7000-8000-000000000000`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` uuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 5`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Alias`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--uuid-version`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-v`})}),(0,n.jsxs)(t.td,{children:[`UUID version: `,(0,n.jsx)(t.code,{children:`4`}),` or `,(0,n.jsx)(t.code,{children:`7`}),` (default: `,(0,n.jsx)(t.code,{children:`4`}),`)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--lowercase`})}),(0,n.jsx)(t.td,{}),(0,n.jsx)(t.td,{children:`Output in lowercase`})]})]})]}),`
`,(0,n.jsx)(t.h3,{id:`ulid`,children:`ulid`}),`
`,(0,n.jsx)(t.p,{children:`Generate ULIDs.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ulid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 01HW9T2W9W9YJ3JZ1H4P4M2T8Q`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ulid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 10`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --monotonic`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 10 strictly ordered ULIDs, as a JSON array`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ulid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 1720000000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a ULID for a fixed Unix timestamp (ms)`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--monotonic`})}),(0,n.jsx)(t.td,{children:`Generate monotonically increasing ULIDs`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--timestamp`})}),(0,n.jsxs)(t.td,{children:[`Unix timestamp in milliseconds, or `,(0,n.jsx)(t.code,{children:`now`})]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--lowercase`})}),(0,n.jsx)(t.td,{children:`Output in lowercase`})]})]})]}),`
`,(0,n.jsx)(t.h3,{id:`typeid`,children:`typeid`}),`
`,(0,n.jsx)(t.p,{children:`Generate TypeIDs: a UUID v7 with a type prefix.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` typeid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --prefix`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` user`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# user_01h2xcejqtf2nbrexx3vqjhp41`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` typeid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -p`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` api_key`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 5`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 5 api_key TypeIDs, as JSON`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` typeid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a canonical prefixless TypeID`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Alias`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsx)(t.tbody,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--prefix`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-p`})}),(0,n.jsxs)(t.td,{children:[`Type prefix, e.g. `,(0,n.jsx)(t.code,{children:`user`}),` for `,(0,n.jsx)(t.code,{children:`user_...`}),` (empty by default)`]})]})})]}),`
`,(0,n.jsx)(t.h3,{id:`nanoid`,children:`nanoid`}),`
`,(0,n.jsx)(t.p,{children:`Generate Nanoids.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` nanoid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 5`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` nanoid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --size`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 10`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --alphabet`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` hex`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a 10-char ID from the hex preset`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Alias`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--size`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-s`})}),(0,n.jsxs)(t.td,{children:[`Length of the ID, 1-256 (default: `,(0,n.jsx)(t.code,{children:`21`}),`)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--alphabet`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-a`})}),(0,n.jsxs)(t.td,{children:[`Custom alphabet or preset: `,(0,n.jsx)(t.code,{children:`hex`}),`, `,(0,n.jsx)(t.code,{children:`numeric`}),`, `,(0,n.jsx)(t.code,{children:`alpha`})]})]})]})]}),`
`,(0,n.jsx)(t.h3,{id:`cuid`,children:`cuid`}),`
`,(0,n.jsx)(t.p,{children:`Generate CUIDs (v2).`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` cuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 5`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` cuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --length`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 10`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a 10-char CUID`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Alias`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsx)(t.tbody,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--length`})}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`-l`})}),(0,n.jsxs)(t.td,{children:[`Length of the ID, 2-32 (default: `,(0,n.jsx)(t.code,{children:`24`}),`)`]})]})})]}),`
`,(0,n.jsx)(t.h3,{id:`ksuid`,children:`ksuid`}),`
`,(0,n.jsx)(t.p,{children:`Generate KSUIDs.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ksuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` -n`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 5`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ksuid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 1720000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a KSUID for a fixed Unix timestamp (s)`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsx)(t.tbody,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--timestamp`})}),(0,n.jsxs)(t.td,{children:[`Unix timestamp in seconds, or `,(0,n.jsx)(t.code,{children:`now`})]})]})})]}),`
`,(0,n.jsx)(t.h3,{id:`objectid`,children:`objectid`}),`
`,(0,n.jsx)(t.p,{children:`Generate MongoDB ObjectIDs.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` objectid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 66e1a8d3f1c2b3a4d5e6f7a8`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` objectid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 1720000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# an ObjectID for a fixed Unix timestamp (s)`})})]})})}),`
`,(0,n.jsx)(t.h3,{id:`xid`,children:`xid`}),`
`,(0,n.jsx)(t.p,{children:`Generate XIDs compatible with rs/xid.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` xid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` xid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 1720000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# an XID for a fixed Unix timestamp (s)`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsx)(t.tbody,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--timestamp`})}),(0,n.jsxs)(t.td,{children:[`Unix timestamp in seconds, or `,(0,n.jsx)(t.code,{children:`now`})]})]})})]}),`
`,(0,n.jsx)(t.h3,{id:`tsid`,children:`tsid`}),`
`,(0,n.jsx)(t.p,{children:`Generate TSIDs: 64-bit Snowflake-style, time-sorted identifiers.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` tsid`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# 0QXW2CK4XZM2A`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` tsid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --timestamp`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 1720000000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a TSID for a fixed Unix timestamp (ms) — note: milliseconds, unlike ksuid/objectid's seconds`})}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` tsid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --node`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 42`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --node-bits`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` 10`})]}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# a TSID for a fixed node ID`})})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--timestamp`})}),(0,n.jsxs)(t.td,{children:[`Unix timestamp in milliseconds, or `,(0,n.jsx)(t.code,{children:`now`})]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--node`})}),(0,n.jsxs)(t.td,{children:[`Node ID (`,(0,n.jsx)(t.code,{children:`0`}),` to `,(0,n.jsx)(t.code,{children:`2^node-bits - 1`}),`)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--node-bits`})}),(0,n.jsxs)(t.td,{children:[`Bits allocated to the node ID, 0-20 (default: `,(0,n.jsx)(t.code,{children:`10`}),`)`]})]})]})]}),`
`,(0,n.jsx)(t.h2,{id:`inspect`,children:`Inspect`}),`
`,(0,n.jsx)(t.p,{children:`Decode the metadata embedded in an ID: type, version, timestamp, and random component.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` inspect`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 018e5e5c-7c8a-7000-8000-000000000000`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` inspect`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --type`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ulid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 01HW9T2W9W9YJ3JZ1H4P4M2T8Q`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` inspect`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 018e5e5c-7c8a-7000-8000-000000000000`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:"# an ID that starts with a dash needs `--` first"})}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` inspect`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --tricky-id`})]})]})})}),`
`,(0,n.jsxs)(t.p,{children:[`The type is auto-detected unless `,(0,n.jsx)(t.code,{children:`--type`}),` is given. For time-ordered IDs (UUID v7, ULID, TypeID, KSUID, ObjectID, XID, TSID), inspect extracts the embedded timestamp. Random-only IDs (UUID v4, CUID v2, Nanoid) report that no decodable metadata is available. Timestamp precision matches each generator: UUID v7, ULID, and TSID are millisecond-precision; KSUID, ObjectID, and XID are second-precision.`]}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--type`})}),(0,n.jsxs)(t.td,{children:[`ID type: `,(0,n.jsx)(t.code,{children:`uuid`}),`, `,(0,n.jsx)(t.code,{children:`ulid`}),`, `,(0,n.jsx)(t.code,{children:`typeid`}),`, `,(0,n.jsx)(t.code,{children:`nanoid`}),`, `,(0,n.jsx)(t.code,{children:`cuid`}),`, `,(0,n.jsx)(t.code,{children:`ksuid`}),`, `,(0,n.jsx)(t.code,{children:`objectid`}),`, `,(0,n.jsx)(t.code,{children:`xid`}),`, `,(0,n.jsx)(t.code,{children:`tsid`}),` (auto-detected if omitted)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--json`})}),(0,n.jsx)(t.td,{children:`Output as JSON`})]})]})]}),`
`,(0,n.jsx)(t.h2,{id:`validate`,children:`Validate`}),`
`,(0,n.jsx)(t.p,{children:`Check whether an ID is well-formed, one at a time or in bulk from stdin.`}),`
`,(0,n.jsx)(n.Fragment,{children:(0,n.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,icon:`<svg viewBox="0 0 24 24"><path d="m 4,4 a 1,1 0 0 0 -0.7070312,0.2929687 1,1 0 0 0 0,1.4140625 L 8.5859375,11 3.2929688,16.292969 a 1,1 0 0 0 0,1.414062 1,1 0 0 0 1.4140624,0 l 5.9999998,-6 a 1.0001,1.0001 0 0 0 0,-1.414062 L 4.7070312,4.2929687 A 1,1 0 0 0 4,4 Z m 8,14 a 1,1 0 0 0 -1,1 1,1 0 0 0 1,1 h 8 a 1,1 0 0 0 1,-1 1,1 0 0 0 -1,-1 z" fill="currentColor" /></svg>`,children:(0,n.jsxs)(t.code,{children:[(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` validate`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 018e5e5c-7c8a-7000-8000-000000000000`})]}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` validate`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --type`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` typeid`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` user_01h2xcejqtf2nbrexx3vqjhp41`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# batch validate, one ID per line`})}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`cat`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` ids.txt`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` |`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` validate`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --stdin`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --json`})]}),`
`,(0,n.jsx)(t.span,{className:`line`}),`
`,(0,n.jsx)(t.span,{className:`line`,children:(0,n.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`# exit code only: 0 = valid, 2 = invalid`})}),`
`,(0,n.jsxs)(t.span,{className:`line`,children:[(0,n.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uniku`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` validate`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:` --quiet`}),(0,n.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` 018e5e5c-7c8a-7000-8000-000000000000`})]})]})})}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Option`}),(0,n.jsx)(t.th,{children:`Description`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--type`})}),(0,n.jsx)(t.td,{children:`Expected ID type (auto-detected if omitted)`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--stdin`})}),(0,n.jsx)(t.td,{children:`Read IDs from stdin (one per line)`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--quiet`})}),(0,n.jsxs)(t.td,{children:[`No output, exit code only (`,(0,n.jsx)(t.code,{children:`0`}),` valid, `,(0,n.jsx)(t.code,{children:`2`}),` invalid)`]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`--json`})}),(0,n.jsx)(t.td,{children:`Output as JSON`})]})]})]}),`
`,(0,n.jsxs)(t.p,{children:[`Use `,(0,n.jsx)(t.code,{children:`--json`}),` whenever the output feeds another program. The CLI and library publish independently: a library `,(0,n.jsx)(t.code,{children:`1.0.0`}),` release does not imply a CLI `,(0,n.jsx)(t.code,{children:`1.0.0`}),` release at the same time.`]})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}function l(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};