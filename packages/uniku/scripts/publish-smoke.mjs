import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENTRYPOINTS } from './entrypoints.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(scriptDir)

// Derived from the shared manifest so every published entry point — including
// objectid, tsid, and generators — is covered here; nothing can be published
// without a matching packed-exports assertion.
const expectedExports = Object.fromEntries(
  ENTRYPOINTS.map((entry) => [
    entry.subpath,
    { types: entry.dts, import: entry.mjs, default: entry.mjs },
  ]),
)

const runtimeSpecifiers = Object.keys(expectedExports).map((subpath) => `uniku${subpath.slice(1)}`)
const sourceDir = join(packageRoot, 'src')

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    ...options,
  })

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n')
    fail(`Command failed: ${command} ${args.join(' ')}\n${details}`)
  }

  return result.stdout.trim()
}

const containsSourceCondition = (value) => {
  if (value === '@jkomyno/source') {
    return true
  }

  if (Array.isArray(value)) {
    return value.some(containsSourceCondition)
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, nestedValue]) => key === '@jkomyno/source' || containsSourceCondition(nestedValue))
  }

  return false
}

const assertPackedExports = (packedPackageJson) => {
  if (containsSourceCondition(packedPackageJson.exports)) {
    fail('Packed exports must not expose the @jkomyno/source condition.')
  }

  const expectedSubpaths = [...Object.keys(expectedExports), './package.json'].sort()
  const actualSubpaths = Object.keys(packedPackageJson.exports ?? {}).sort()
  if (JSON.stringify(actualSubpaths) !== JSON.stringify(expectedSubpaths)) {
    fail(`Packed exports must exactly match the entrypoint manifest. Got: ${actualSubpaths.join(', ')}`)
  }

  for (const [subpath, expected] of Object.entries(expectedExports)) {
    const actual = packedPackageJson.exports?.[subpath]

    if (!actual) {
      fail(`Packed exports are missing ${subpath}.`)
    }

    for (const [condition, expectedTarget] of Object.entries(expected)) {
      if (actual[condition] !== expectedTarget) {
        fail(`Packed exports.${subpath}.${condition} should be ${expectedTarget}, got ${JSON.stringify(actual[condition])}.`)
      }
    }
  }

  if (packedPackageJson.exports?.['./package.json'] !== './package.json') {
    fail('Packed exports must expose ./package.json.')
  }
}

const listTypeScriptSources = (dir) => {
  const files = []

  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      files.push(...listTypeScriptSources(entryPath))
    } else if (stat.isFile() && entryPath.endsWith('.ts')) {
      files.push(entryPath)
    }
  }

  return files
}

const assertSourcesArePacked = (tarballPath) => {
  const packedFiles = new Set(run('tar', ['-tf', tarballPath]).split(/\r?\n/))

  for (const sourcePath of listTypeScriptSources(sourceDir)) {
    const packedPath = `package/${relative(packageRoot, sourcePath)}`

    if (!packedFiles.has(packedPath)) {
      fail(`Packed tarball is missing ${packedPath}.`)
    }
  }
}

const SHARED_ENTRYPOINTS = new Set(['./errors', './generators'])
// Generator-to-generator imports that exist by design: TypeID embeds a UUID v7,
// and `cuid/v2` is the canonical name for `cuid2`.
const ALLOWED_GENERATOR_IMPORTS = {
  './typeid': ['./uuid/v7'],
  './cuid/v2': ['./cuid2'],
}
const RELATIVE_IMPORT = /\b(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g

const assertEntryIsolation = (packageDir) => {
  const generatorEntries = ENTRYPOINTS.filter((entry) => !SHARED_ENTRYPOINTS.has(entry.subpath))
  const subpathByFile = new Map(generatorEntries.map((entry) => [resolve(packageDir, entry.mjs), entry.subpath]))

  for (const entry of generatorEntries) {
    const allowed = new Set(ALLOWED_GENERATOR_IMPORTS[entry.subpath] ?? [])
    const start = resolve(packageDir, entry.mjs)
    const seen = new Set([start])
    const pending = [start]

    while (pending.length > 0) {
      const file = pending.pop()
      for (const [, specifier] of readFileSync(file, 'utf8').matchAll(RELATIVE_IMPORT)) {
        const target = resolve(dirname(file), specifier)
        if (seen.has(target)) continue
        seen.add(target)

        const reached = subpathByFile.get(target)
        if (reached && !allowed.has(reached)) {
          fail(`uniku${entry.subpath.slice(1)} must not import uniku${reached.slice(1)} (via ${relative(packageDir, file)}).`)
        }
        pending.push(target)
      }
    }
  }
}

const assertRuntimeResolution = (tarballPath, tempDir) => {
  const appDir = join(tempDir, 'app')
  const packageDir = join(appDir, 'node_modules', 'uniku')
  mkdirSync(packageDir, { recursive: true })

  run('tar', ['-xzf', tarballPath, '-C', packageDir, '--strip-components=1'])
  assertEntryIsolation(packageDir)

  const resolutionScript = `
    const specifiers = ${JSON.stringify(runtimeSpecifiers)};
    for (const specifier of specifiers) {
      const resolved = import.meta.resolve(specifier);
      if (!resolved.includes('/build/')) {
        throw new Error(\`\${specifier} resolved outside build/: \${resolved}\`);
      }
    }

    const uuidv7 = await import('uniku/uuid/v7');
    if (typeof uuidv7.uuidv7 !== 'function') {
      throw new Error('uniku/uuid/v7 did not expose uuidv7.');
    }
  `

  const result = spawnSync('node', ['--conditions=@jkomyno/source', '--input-type=module', '-e', resolutionScript], {
    cwd: appDir,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    fail('Packed package failed to resolve under --conditions=@jkomyno/source.')
  }
}

const tempDir = mkdtempSync(join(tmpdir(), 'uniku-publish-smoke-'))

try {
  const packOutput = run('pnpm', ['pack', '--pack-destination', tempDir])
  const tarballPath = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith('.tgz'))

  if (!tarballPath) {
    fail(`Could not find packed tarball path in pnpm pack output:\n${packOutput}`)
  }

  const packedPackageJson = JSON.parse(run('tar', ['-xOf', tarballPath, 'package/package.json']))
  assertPackedExports(packedPackageJson)
  assertSourcesArePacked(tarballPath)
  assertRuntimeResolution(tarballPath, tempDir)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
