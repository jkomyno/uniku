import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

type ApiExample = {
  input: string
  output: string
}

type GeneratorDefinition = {
  examples: Record<string, ApiExample>
  id: string
  exportName: string
  sourceExportName?: string
  sourcePath: string
  typeName: string
}

type ApiSignature = {
  description?: string
  text: string
}

type ApiOptionField = {
  description?: string
  name: string
  optional: boolean
  type: string
}

type ApiOptions = {
  fields: ApiOptionField[]
  typeName: string
}

type ApiMember = {
  example: ApiExample
  name: string
  options?: ApiOptions
  signatures: ApiSignature[]
}

type GeneratorApi = {
  description?: string
  members: ApiMember[]
  sourcePath: string
}

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(docsRoot, '../..')
const outputPath = resolve(docsRoot, 'src/generated/api-reference.ts')

const generators: GeneratorDefinition[] = [
  {
    examples: {
      uuidv4: {
        input: 'uuidv4()',
        output: "'cb688bf0-b80c-4931-91cd-8c31b8d9d131'",
      },
      toBytes: {
        input: "uuidv4.toBytes('cb688bf0-b80c-4931-91cd-8c31b8d9d131')",
        output: 'Uint8Array [203, 104, 139, 240, 184, 12, 73, 49, 145, 205, 140, 49, 184, 217, 209, 49]',
      },
      fromBytes: {
        input:
          'uuidv4.fromBytes(Uint8Array.from([203, 104, 139, 240, 184, 12, 73, 49, 145, 205, 140, 49, 184, 217, 209, 49]))',
        output: "'cb688bf0-b80c-4931-91cd-8c31b8d9d131'",
      },
      isValid: { input: "uuidv4.isValid('cb688bf0-b80c-4931-91cd-8c31b8d9d131')", output: 'true' },
      NIL: { input: 'uuidv4.NIL', output: "'00000000-0000-0000-0000-000000000000'" },
      MAX: { input: 'uuidv4.MAX', output: "'ffffffff-ffff-ffff-ffff-ffffffffffff'" },
    },
    id: 'uuid-v4',
    exportName: 'uuidv4',
    sourcePath: 'packages/uniku/src/uuid/v4.ts',
    typeName: 'UuidV4',
  },
  {
    examples: {
      uuidv7: {
        input: 'uuidv7()',
        output: "'019f5732-0342-75f9-9efd-fc3c1f8da7fd'",
      },
      toBytes: {
        input: "uuidv7.toBytes('019f5732-0342-75f9-9efd-fc3c1f8da7fd')",
        output: 'Uint8Array [1, 159, 87, 50, 3, 66, 117, 249, 158, 253, 252, 60, 31, 141, 167, 253]',
      },
      fromBytes: {
        input:
          'uuidv7.fromBytes(Uint8Array.from([1, 159, 87, 50, 3, 66, 117, 249, 158, 253, 252, 60, 31, 141, 167, 253]))',
        output: "'019f5732-0342-75f9-9efd-fc3c1f8da7fd'",
      },
      timestamp: { input: "uuidv7.timestamp('019f5732-0342-75f9-9efd-fc3c1f8da7fd')", output: '1783874323266' },
      isValid: { input: "uuidv7.isValid('019f5732-0342-75f9-9efd-fc3c1f8da7fd')", output: 'true' },
      NIL: { input: 'uuidv7.NIL', output: "'00000000-0000-0000-0000-000000000000'" },
      MAX: { input: 'uuidv7.MAX', output: "'ffffffff-ffff-ffff-ffff-ffffffffffff'" },
    },
    id: 'uuid-v7',
    exportName: 'uuidv7',
    sourcePath: 'packages/uniku/src/uuid/v7.ts',
    typeName: 'UuidV7',
  },
  {
    examples: {
      ulid: {
        input: 'ulid()',
        output: "'01KXBK40T3EQW5BGTMQRX89PTA'",
      },
      toBytes: {
        input: "ulid.toBytes('01KXBK40T3EQW5BGTMQRX89PTA')",
        output: 'Uint8Array [1, 159, 87, 50, 3, 67, 117, 248, 85, 195, 84, 190, 58, 132, 219, 74]',
      },
      fromBytes: {
        input: 'ulid.fromBytes(Uint8Array.from([1, 159, 87, 50, 3, 67, 117, 248, 85, 195, 84, 190, 58, 132, 219, 74]))',
        output: "'01KXBK40T3EQW5BGTMQRX89PTA'",
      },
      timestamp: { input: "ulid.timestamp('01KXBK40T3EQW5BGTMQRX89PTA')", output: '1783874323267' },
      isValid: { input: "ulid.isValid('01KXBK40T3EQW5BGTMQRX89PTA')", output: 'true' },
      NIL: { input: 'ulid.NIL', output: "'00000000000000000000000000'" },
      MAX: { input: 'ulid.MAX', output: "'7ZZZZZZZZZZZZZZZZZZZZZZZZZ'" },
    },
    id: 'ulid',
    exportName: 'ulid',
    sourcePath: 'packages/uniku/src/ulid/ulid.ts',
    typeName: 'Ulid',
  },
  {
    examples: {
      typeid: {
        input: "typeid('user')",
        output: "'user_01kxbk40t3egn9xec2thzpa2w7'",
      },
      toBytes: {
        input: "typeid.toBytes('user_01kxbk40t3egn9xec2thzpa2w7')",
        output: 'Uint8Array [1, 159, 87, 50, 3, 67, 116, 42, 158, 185, 130, 212, 127, 101, 11, 135]',
      },
      fromBytes: {
        input:
          "typeid.fromBytes('user', Uint8Array.from([1, 159, 87, 50, 3, 67, 116, 42, 158, 185, 130, 212, 127, 101, 11, 135]))",
        output: "'user_01kxbk40t3egn9xec2thzpa2w7'",
      },
      toUuid: {
        input: "typeid.toUuid('user_01kxbk40t3egn9xec2thzpa2w7')",
        output: "'019f5732-0343-742a-9eb9-82d47f650b87'",
      },
      fromUuid: {
        input: "typeid.fromUuid('user', '019f5732-0343-742a-9eb9-82d47f650b87')",
        output: "'user_01kxbk40t3egn9xec2thzpa2w7'",
      },
      timestamp: { input: "typeid.timestamp('user_01kxbk40t3egn9xec2thzpa2w7')", output: '1783874323267' },
      prefix: { input: "typeid.prefix('user_01kxbk40t3egn9xec2thzpa2w7')", output: "'user'" },
      suffix: { input: "typeid.suffix('user_01kxbk40t3egn9xec2thzpa2w7')", output: "'01kxbk40t3egn9xec2thzpa2w7'" },
      isValid: { input: "typeid.isValid('user_01kxbk40t3egn9xec2thzpa2w7')", output: 'true' },
    },
    id: 'typeid',
    exportName: 'typeid',
    sourcePath: 'packages/uniku/src/typeid/typeid.ts',
    typeName: 'Typeid',
  },
  {
    examples: {
      cuidv2: {
        input: 'cuidv2()',
        output: "'rqa97fgr3wexenbnth08ihdk'",
      },
      isValid: { input: "cuidv2.isValid('rqa97fgr3wexenbnth08ihdk')", output: 'true' },
    },
    id: 'cuid-v2',
    exportName: 'cuidv2',
    sourceExportName: 'cuid2',
    sourcePath: 'packages/uniku/src/cuid2/cuid2.ts',
    typeName: 'Cuid2',
  },
  {
    examples: {
      nanoid: {
        input: 'nanoid()',
        output: "'tCDaBJOIwLpjLMxN_DYdU'",
      },
      isValid: { input: "nanoid.isValid('tCDaBJOIwLpjLMxN_DYdU')", output: 'true' },
    },
    id: 'nanoid',
    exportName: 'nanoid',
    sourcePath: 'packages/uniku/src/nanoid/nanoid.ts',
    typeName: 'Nanoid',
  },
  {
    examples: {
      ksuid: {
        input: 'ksuid()',
        output: "'3GPXkrDipgmtLBpkbfrWSPz8a4F'",
      },
      toBytes: {
        input: "ksuid.toBytes('3GPXkrDipgmtLBpkbfrWSPz8a4F')",
        output: 'Uint8Array [22, 225, 117, 19, 120, 60, 250, 61, 34, 48, 251, 162, 113, 208, 26, 211, 45, 233, 80, 7]',
      },
      fromBytes: {
        input:
          'ksuid.fromBytes(Uint8Array.from([22, 225, 117, 19, 120, 60, 250, 61, 34, 48, 251, 162, 113, 208, 26, 211, 45, 233, 80, 7]))',
        output: "'3GPXkrDipgmtLBpkbfrWSPz8a4F'",
      },
      timestamp: { input: "ksuid.timestamp('3GPXkrDipgmtLBpkbfrWSPz8a4F')", output: '1783874323000' },
      isValid: { input: "ksuid.isValid('3GPXkrDipgmtLBpkbfrWSPz8a4F')", output: 'true' },
      NIL: { input: 'ksuid.NIL', output: "'000000000000000000000000000'" },
      MAX: { input: 'ksuid.MAX', output: "'aWgEPTl1tmebfsQzFP4bxwgy80V'" },
    },
    id: 'ksuid',
    exportName: 'ksuid',
    sourcePath: 'packages/uniku/src/ksuid/ksuid.ts',
    typeName: 'Ksuid',
  },
  {
    examples: {
      objectid: {
        input: 'objectid()',
        output: "'6a53c3139f0aac9835059f6f'",
      },
      toBytes: {
        input: "objectid.toBytes('6a53c3139f0aac9835059f6f')",
        output: 'Uint8Array [106, 83, 195, 19, 159, 10, 172, 152, 53, 5, 159, 111]',
      },
      fromBytes: {
        input: 'objectid.fromBytes(Uint8Array.from([106, 83, 195, 19, 159, 10, 172, 152, 53, 5, 159, 111]))',
        output: "'6a53c3139f0aac9835059f6f'",
      },
      timestamp: { input: "objectid.timestamp('6a53c3139f0aac9835059f6f')", output: '1783874323000' },
      isValid: { input: "objectid.isValid('6a53c3139f0aac9835059f6f')", output: 'true' },
      NIL: { input: 'objectid.NIL', output: "'000000000000000000000000'" },
      MAX: { input: 'objectid.MAX', output: "'ffffffffffffffffffffffff'" },
    },
    id: 'objectid',
    exportName: 'objectid',
    sourcePath: 'packages/uniku/src/objectid/objectid.ts',
    typeName: 'ObjectId',
  },
  {
    examples: {
      tsid: {
        input: 'tsid()',
        output: '864184007999370855n',
      },
      toBytes: {
        input: 'tsid.toBytes(864184007999370855n)',
        output: 'Uint8Array [11, 254, 50, 198, 209, 96, 54, 103]',
      },
      fromBytes: {
        input: 'tsid.fromBytes(Uint8Array.from([11, 254, 50, 198, 209, 96, 54, 103]))',
        output: '864184007999370855n',
      },
      toString: { input: 'tsid.toString(864184007999370855n)', output: "'0QZHJRV8P0DK7'" },
      fromString: { input: "tsid.fromString('0QZHJRV8P0DK7')", output: '864184007999370855n' },
      timestamp: { input: 'tsid.timestamp(864184007999370855n)', output: '1783874323269' },
      isValid: { input: 'tsid.isValid(864184007999370855n)', output: 'true' },
      NIL: { input: 'tsid.NIL', output: '0n' },
      MAX: { input: 'tsid.MAX', output: '18446744073709551615n' },
    },
    id: 'tsid',
    exportName: 'tsid',
    sourcePath: 'packages/uniku/src/tsid/tsid.ts',
    typeName: 'Tsid',
  },
]

function jsDocText(node: ts.Node): string | undefined {
  const jsDoc = (node as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc ?? []
  const comments = jsDoc
    .flatMap((comment) => {
      if (typeof comment.comment === 'string') return [comment.comment]
      return comment.comment?.map((part) => part.text) ?? []
    })
    .map((comment) => comment.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return comments.join(' ') || undefined
}

function findTypeAlias(sourceFile: ts.SourceFile, typeName: string): ts.TypeAliasDeclaration {
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName) return statement
  }

  throw new Error(`Could not find exported type ${typeName} in ${sourceFile.fileName}`)
}

function findExportDescription(sourceFile: ts.SourceFile, exportName: string): string | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    if (
      statement.declarationList.declarations.some((declaration) => declaration.name.getText(sourceFile) === exportName)
    ) {
      return jsDocText(statement)
    }
  }

  return undefined
}

function callSignature(exportName: string, member: ts.CallSignatureDeclaration, sourceFile: ts.SourceFile): string {
  return `${exportName}${member.getText(sourceFile).replace(/;$/, '')}`
}

function memberSignature(member: ts.PropertySignature | ts.MethodSignature, sourceFile: ts.SourceFile): string {
  return member.getText(sourceFile).replace(/;$/, '')
}

function exampleFor(name: string, examples: Record<string, ApiExample>, typeName: string): ApiExample {
  const example = examples[name]
  if (!example) throw new Error(`Could not find an example for ${typeName}.${name}`)
  return example
}

function findTypeAliasByName(sourceFile: ts.SourceFile, typeName: string): ts.TypeAliasDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName) return statement
  }
  return undefined
}

/**
 * Resolves an options type name to its underlying type literal, following
 * simple `type X = Y` alias chains across source files already loaded into
 * the program (for example `TypeidOptions = UuidV7Options`).
 */
function resolveOptionsTypeLiteral(
  program: ts.Program,
  sourceFile: ts.SourceFile,
  typeName: string,
): { literal: ts.TypeLiteralNode; sourceFile: ts.SourceFile } | undefined {
  let currentFile = sourceFile
  let currentName = typeName

  for (let depth = 0; depth < 5; depth += 1) {
    const alias = findTypeAliasByName(currentFile, currentName)
    if (!alias) return undefined
    if (ts.isTypeLiteralNode(alias.type)) return { literal: alias.type, sourceFile: currentFile }
    if (!ts.isTypeReferenceNode(alias.type)) return undefined

    const nextName = alias.type.typeName.getText(currentFile)
    const nextFile = program
      .getSourceFiles()
      .find((candidate) => !candidate.fileName.includes('node_modules') && findTypeAliasByName(candidate, nextName))
    if (!nextFile) return undefined

    currentFile = nextFile
    currentName = nextName
  }

  return undefined
}

function optionFieldsFor(literal: ts.TypeLiteralNode, sourceFile: ts.SourceFile): ApiOptionField[] {
  const fields: ApiOptionField[] = []

  for (const member of literal.members) {
    if (!ts.isPropertySignature(member) || !member.name) continue
    fields.push({
      description: jsDocText(member),
      name: member.name.getText(sourceFile),
      optional: member.questionToken !== undefined,
      type: member.type ? member.type.getText(sourceFile) : 'unknown',
    })
  }

  return fields
}

function optionsFor(program: ts.Program, sourceFile: ts.SourceFile, typeName: string): ApiOptions | undefined {
  const optionsTypeName = `${typeName}Options`
  const resolved = resolveOptionsTypeLiteral(program, sourceFile, optionsTypeName)
  if (!resolved) return undefined

  return {
    fields: optionFieldsFor(resolved.literal, resolved.sourceFile),
    typeName: optionsTypeName,
  }
}

function membersFor(
  program: ts.Program,
  typeAlias: ts.TypeAliasDeclaration,
  exportName: string,
  examples: Record<string, ApiExample>,
  sourceFile: ts.SourceFile,
): ApiMember[] {
  if (!ts.isTypeLiteralNode(typeAlias.type)) {
    throw new Error(`${typeAlias.name.text} must be a type literal`)
  }

  const callSignatures = typeAlias.type.members.filter(ts.isCallSignatureDeclaration)
  const members: ApiMember[] = []

  if (callSignatures.length > 0) {
    members.push({
      example: exampleFor(exportName, examples, typeAlias.name.text),
      name: exportName,
      options: optionsFor(program, sourceFile, typeAlias.name.text),
      signatures: callSignatures.map((member) => ({
        description: jsDocText(member),
        text: callSignature(exportName, member, sourceFile),
      })),
    })
  }

  for (const member of typeAlias.type.members) {
    if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member)) continue
    if (!member.name) continue
    members.push({
      example: exampleFor(member.name.getText(sourceFile), examples, typeAlias.name.text),
      name: member.name.getText(sourceFile),
      signatures: [{ description: jsDocText(member), text: memberSignature(member, sourceFile) }],
    })
  }

  return members
}

function generate(): Record<string, GeneratorApi> {
  const sourcePaths = generators.map(({ sourcePath }) => resolve(repositoryRoot, sourcePath))
  const program = ts.createProgram(sourcePaths, { target: ts.ScriptTarget.ES2022 })
  const apis: Record<string, GeneratorApi> = {}

  for (const generator of generators) {
    const absoluteSourcePath = resolve(repositoryRoot, generator.sourcePath)
    const sourceFile = program.getSourceFile(absoluteSourcePath)
    if (!sourceFile) throw new Error(`Could not load ${generator.sourcePath}`)

    const typeAlias = findTypeAlias(sourceFile, generator.typeName)
    apis[generator.id] = {
      description: findExportDescription(sourceFile, generator.sourceExportName ?? generator.exportName),
      members: membersFor(program, typeAlias, generator.exportName, generator.examples, sourceFile),
      sourcePath: relative(repositoryRoot, absoluteSourcePath).replaceAll('\\', '/'),
    }
  }

  return apis
}

const apiReference = generate()
const typeDeclarations = `export type GeneratorId = ${generators.map(({ id }) => `'${id}'`).join(' | ')}

export type ApiExample = {
  input: string
  output: string
}

export type ApiSignature = {
  description?: string
  text: string
}

export type ApiOptionField = {
  description?: string
  name: string
  optional: boolean
  type: string
}

export type ApiOptions = {
  fields: readonly ApiOptionField[]
  typeName: string
}

export type ApiMember = {
  example: ApiExample
  name: string
  options?: ApiOptions
  signatures: readonly ApiSignature[]
}

export type GeneratorApi = {
  description?: string
  members: readonly ApiMember[]
  sourcePath: string
}
`
const source = `// This file is generated by scripts/generate-api-reference.ts. Do not edit it directly.\n\n${typeDeclarations}\nexport const generatorApis: Record<GeneratorId, GeneratorApi> = ${JSON.stringify(apiReference, null, 2)} as const\n`

let existingSource: string | undefined
try {
  existingSource = readFileSync(outputPath, 'utf8')
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

if (existingSource !== source) {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, source)
}
