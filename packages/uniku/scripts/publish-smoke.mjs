import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENTRYPOINTS } from './entrypoints.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(scriptDir)
const workspaceRoot = dirname(dirname(packageRoot))
const forbiddenSubpaths = ['./cuid2']
const typeContractPath = join(packageRoot, '__tests__', 'types', 'v1-removals.type-test.ts')

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
const packageJsonPath = join(packageRoot, 'package.json')

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

const assertForbiddenSubpaths = (exportsMap, label) => {
  for (const subpath of forbiddenSubpaths) {
    if (Object.hasOwn(exportsMap ?? {}, subpath)) {
      fail(`${label} must not expose forbidden subpath ${subpath}.`)
    }
  }
}

const assertPackedExports = (packedPackageJson) => {
  assertForbiddenSubpaths(packedPackageJson.exports, 'Packed exports')

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

const listPackedFiles = (tarballPath) => new Set(run('tar', ['-tf', tarballPath]).split(/\r?\n/))

const assertSourcesArePacked = (packedFiles) => {
  for (const sourcePath of listTypeScriptSources(sourceDir)) {
    const packedPath = `package/${relative(packageRoot, sourcePath)}`

    if (!packedFiles.has(packedPath)) {
      fail(`Packed tarball is missing ${packedPath}.`)
    }
  }
}

const assertForbiddenTarEntries = (packedFiles) => {
  for (const subpath of forbiddenSubpaths) {
    const relativeSubpath = subpath.slice(2)
    const forbiddenPrefixes = [`package/build/${relativeSubpath}/`, `package/src/${relativeSubpath}/`]

    for (const packedFile of packedFiles) {
      if (forbiddenPrefixes.some((prefix) => packedFile.startsWith(prefix))) {
        fail(`Packed tarball contains forbidden legacy path ${packedFile}.`)
      }
    }
  }
}

const assertInstalledConsumer = (tarballPath, tempDir) => {
  const appDir = join(tempDir, 'app')
  mkdirSync(appDir, { recursive: true })

  writeFileSync(
    join(appDir, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        uniku: `file:${tarballPath}`,
      },
    }),
  )
  run('pnpm', ['install', '--ignore-scripts'], { cwd: appDir })

  const resolutionScript = `
    const specifiers = ${JSON.stringify(runtimeSpecifiers)};
    for (const specifier of specifiers) {
      const resolved = import.meta.resolve(specifier);
      if (!resolved.includes('/build/')) {
        throw new Error(\`\${specifier} resolved outside build/: \${resolved}\`);
      }
    }

    const canonicalCuid = await import('uniku/cuid/v2');
    if (typeof canonicalCuid.cuidv2 !== 'function' || !canonicalCuid.cuidv2.isValid(canonicalCuid.cuidv2())) {
      throw new Error('uniku/cuid/v2 did not expose a working cuidv2 generator.');
    }

    let legacyError;
    try {
      await import('uniku/cuid2');
    } catch (error) {
      legacyError = error;
    }
    if (legacyError?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      throw new Error(\`uniku/cuid2 should fail with ERR_PACKAGE_PATH_NOT_EXPORTED, got \${legacyError?.code}\`);
    }
  `

  const result = spawnSync('node', ['--conditions=@jkomyno/source', '--input-type=module', '-e', resolutionScript], {
    cwd: appDir,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    fail('Installed packed package failed its runtime export contract.')
  }

  writeFileSync(join(appDir, 'v1-removals.type-test.ts'), readFileSync(typeContractPath, 'utf8'))
  writeFileSync(
    join(appDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2023',
        types: [],
      },
      include: ['v1-removals.type-test.ts'],
    }),
  )
  const tscPath = join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc')
  run(process.execPath, [tscPath, '--project', join(appDir, 'tsconfig.json')], { cwd: appDir })
}

const sourcePackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
assertForbiddenSubpaths(sourcePackageJson.exports, 'Source exports')
assertForbiddenSubpaths(sourcePackageJson.publishConfig?.exports, 'Publish exports')

const tempDir = mkdtempSync(join(tmpdir(), 'uniku-publish-smoke-'))

try {
  const packOutput = run('pnpm', ['pack', '--pack-destination', tempDir])
  const packedTarballPath = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith('.tgz'))

  if (!packedTarballPath) {
    fail(`Could not find packed tarball path in pnpm pack output:\n${packOutput}`)
  }

  const tarballPath = resolve(packageRoot, packedTarballPath)
  const packedPackageJson = JSON.parse(run('tar', ['-xOf', tarballPath, 'package/package.json']))
  const packedFiles = listPackedFiles(tarballPath)
  assertPackedExports(packedPackageJson)
  assertSourcesArePacked(packedFiles)
  assertForbiddenTarEntries(packedFiles)
  assertInstalledConsumer(tarballPath, tempDir)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
