#!/usr/bin/env node
// Typechecks every fenced ts/typescript code block in this skill against the
// Effect version declared by the local repos/effect checkout, so examples
// stay honest as the upstream Effect v4 beta evolves.
//
// Usage:
//   node check-examples.mjs              # checks SKILL.md + references/*.md
//   node check-examples.mjs <file.md>... # checks the given markdown files
//
// First run bootstraps a scratch package under the OS temp dir (npm install of
// effect + @effect/platform-node + @effect/vitest + typescript); later runs reuse it.
// A fence tagged `ts no-check` is skipped — use sparingly, with a reason.
//
// Exit code 0 = every checked block compiles; 1 = at least one error.
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..')
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..', '..', '..')

const sanitizeCachePart = (value) => value.replace(/[^A-Za-z0-9.-]/g, '_')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const EFFECT_REPO = path.join(REPO_ROOT, 'repos', 'effect')
const effectPackage = readJson(path.join(EFFECT_REPO, 'packages', 'effect', 'package.json'))
const effectRootPackage = readJson(path.join(EFFECT_REPO, 'package.json'))
const effectVersion = effectPackage.version
const typescriptSpec = effectRootPackage.devDependencies?.typescript ?? '^6.0.0'
const SCRATCH = path.join(
  os.tmpdir(),
  `effect4-skill-check-${sanitizeCachePart(effectVersion)}-ts-${sanitizeCachePart(typescriptSpec)}`,
)

const bootstrap = () => {
  if (fs.existsSync(path.join(SCRATCH, 'node_modules', 'effect', 'package.json'))) return
  console.log(`Bootstrapping scratch typecheck env at ${SCRATCH} (one-time npm install)...`)
  fs.mkdirSync(SCRATCH, { recursive: true })
  fs.writeFileSync(
    path.join(SCRATCH, 'package.json'),
    JSON.stringify({ name: 'effect4-skill-check', private: true, type: 'module' }, null, 2),
  )
  execFileSync(
    'npm',
    [
      'install',
      '--silent',
      `effect@${effectVersion}`,
      `@effect/platform-node@${effectVersion}`,
      `@effect/vitest@${effectVersion}`,
      `typescript@${typescriptSpec}`,
      '@types/node',
    ],
    { cwd: SCRATCH, stdio: 'inherit' },
  )
  fs.writeFileSync(
    path.join(SCRATCH, 'tsconfig.base.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['ES2023', 'DOM', 'DOM.Iterable'],
          types: ['node'],
          skipLibCheck: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          allowImportingTsExtensions: true,
        },
      },
      null,
      2,
    ),
  )
}

const checkFile = (mdFile) => {
  const source = fs.readFileSync(mdFile, 'utf8')
  const lines = source.split('\n')

  const blocks = []
  let current = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(/^```(\S*)\s*(.*)$/)
    if (fence && current === null) {
      current = { lang: fence[1], info: fence[2] ?? '', startLine: i + 1, code: [] }
    } else if (line.startsWith('```') && current !== null) {
      blocks.push({ ...current, code: current.code.join('\n') })
      current = null
    } else if (current !== null) {
      current.code.push(line)
    }
  }

  const tsBlocks = blocks.filter((b) => b.lang === 'ts' || b.lang === 'typescript')
  const checked = tsBlocks.filter((b) => !b.info.includes('no-check'))
  const skipped = tsBlocks.length - checked.length

  if (checked.length === 0) {
    console.log(`OK: no ts blocks to check in ${mdFile} (${skipped} skipped)`)
    return true
  }

  const slug = path.basename(mdFile).replace(/[^a-zA-Z0-9_-]/g, '_')
  const outDir = path.join(SCRATCH, 'blocks', slug)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  const fileToBlock = new Map()
  checked.forEach((b, i) => {
    const name = `block-${String(i + 1).padStart(3, '0')}.ts`
    fileToBlock.set(name, b)
    fs.writeFileSync(path.join(outDir, name), b.code)
  })
  fs.writeFileSync(
    path.join(outDir, 'tsconfig.json'),
    JSON.stringify({ extends: '../../tsconfig.base.json', include: ['*.ts'] }, null, 2),
  )

  let raw = ''
  try {
    execFileSync(
      path.join(SCRATCH, 'node_modules', '.bin', 'tsc'),
      ['-p', path.join(outDir, 'tsconfig.json'), '--pretty', 'false'],
      { encoding: 'utf8', cwd: SCRATCH },
    )
    console.log(`OK: ${checked.length}/${tsBlocks.length} ts blocks compile (${skipped} skipped) in ${mdFile}`)
    return true
  } catch (err) {
    raw = `${err.stdout ?? ''}${err.stderr ?? ''}`
  }

  console.log(`FAIL: ${mdFile}`)
  for (const l of raw.split('\n').filter((line) => line.includes('error TS'))) {
    const m = l.match(/blocks\/[^/]+\/(block-\d+\.ts)[(:](\d+)/)
    const block = m ? fileToBlock.get(m[1]) : undefined
    const mdLine = block && m ? block.startLine + Number(m[2]) : '?'
    console.log(`  md line ~${mdLine}: ${l.replace(/^.*error TS/, 'error TS')}`)
  }
  return false
}

const args = process.argv.slice(2)
const targets =
  args.length > 0
    ? args.map((a) => path.resolve(a))
    : [
        path.join(SKILL_DIR, 'SKILL.md'),
        ...fs
          .readdirSync(path.join(SKILL_DIR, 'references'))
          .filter((f) => f.endsWith('.md'))
          .map((f) => path.join(SKILL_DIR, 'references', f)),
      ]

bootstrap()
let ok = true
for (const t of targets) ok = checkFile(t) && ok
process.exit(ok ? 0 : 1)
