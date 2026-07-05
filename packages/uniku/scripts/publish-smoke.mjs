import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(scriptDir)

const expectedExports = {
  './uuid/v4': {
    types: './build/uuid/v4.d.mts',
    import: './build/uuid/v4.mjs',
    default: './build/uuid/v4.mjs',
  },
  './uuid/v7': {
    types: './build/uuid/v7.d.mts',
    import: './build/uuid/v7.mjs',
    default: './build/uuid/v7.mjs',
  },
  './ulid': {
    types: './build/ulid/ulid.d.mts',
    import: './build/ulid/ulid.mjs',
    default: './build/ulid/ulid.mjs',
  },
  './typeid': {
    types: './build/typeid/typeid.d.mts',
    import: './build/typeid/typeid.mjs',
    default: './build/typeid/typeid.mjs',
  },
  './cuid2': {
    types: './build/cuid2/cuid2.d.mts',
    import: './build/cuid2/cuid2.mjs',
    default: './build/cuid2/cuid2.mjs',
  },
  './nanoid': {
    types: './build/nanoid/nanoid.d.mts',
    import: './build/nanoid/nanoid.mjs',
    default: './build/nanoid/nanoid.mjs',
  },
  './ksuid': {
    types: './build/ksuid/ksuid.d.mts',
    import: './build/ksuid/ksuid.mjs',
    default: './build/ksuid/ksuid.mjs',
  },
  './errors': {
    types: './build/errors.d.mts',
    import: './build/errors.mjs',
    default: './build/errors.mjs',
  },
}

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

const assertRuntimeResolution = (tarballPath, tempDir) => {
  const appDir = join(tempDir, 'app')
  const packageDir = join(appDir, 'node_modules', 'uniku')
  mkdirSync(packageDir, { recursive: true })

  run('tar', ['-xzf', tarballPath, '-C', packageDir, '--strip-components=1'])

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
