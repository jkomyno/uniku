import type { Codemod, SgNode, TypesMap } from 'codemod:ast-grep'
import { useMetricAtom } from 'codemod:metrics'

import { type AuditCandidate, classifyAuditCandidates, renderAuditFinding } from './audit.ts'
import { type PlannedEdit, planEdits } from './edit-plan.ts'
import {
  ERROR_CODE_BY_SOURCE,
  type ErrorCodeMigration,
  GENERATOR_BY_MODULE,
  GENERATOR_MIGRATIONS,
  type GeneratorMigration,
  type MigrationRule,
  RULES,
} from './mappings.ts'

type Node = SgNode<TypesMap>

interface Binding {
  readonly kind: 'named' | 'namespace'
  readonly localName: string
  readonly localNode: Node
  readonly definitionStart: number
  readonly definitionEnd: number
  readonly referenceStarts: ReadonlySet<number>
  readonly migration: GeneratorMigration
}

interface GroupMetadata {
  readonly node: Node
  readonly rule: MigrationRule
}

const manualMigrationMetric = useMetricAtom('uniku-v1-manual-migrations')

const findAll = (node: Node, kind: string): Node[] => node.findAll({ rule: { kind } }) as Node[]

const nodeField = (node: Node, name: string): Node | null => node.field(name) as Node | null

const nodeKind = (node: Node): string => String(node.kind())

const stringValue = (node: Node | null): string | null => {
  if (node?.kind() !== 'string') return null
  const text = node.text()
  const quote = text[0]
  if ((quote !== "'" && quote !== '"') || text.at(-1) !== quote) return null
  return text.slice(1, -1)
}

const replacementForString = (node: Node, value: string): string => `${node.text()[0]}${value}${node.text().at(-1)}`

const sameRange = (left: Node, right: Node): boolean => {
  const leftRange = left.range()
  const rightRange = right.range()
  return leftRange.start.index === rightRange.start.index && leftRange.end.index === rightRange.end.index
}

const isInsideRange = (node: Node, start: number, end: number): boolean => {
  const range = node.range()
  return range.start.index >= start && range.end.index <= end
}

const collectReferences = (localNode: Node, filename: string): ReadonlySet<number> => {
  const starts = new Set<number>()

  for (const fileReferences of localNode.references()) {
    if (fileReferences.root.filename() !== filename) continue
    for (const reference of fileReferences.nodes) {
      starts.add(reference.range().start.index)
    }
  }

  return starts
}

const createBinding = (
  kind: Binding['kind'],
  localNode: Node,
  definitionNode: Node,
  migration: GeneratorMigration,
  filename: string,
): Binding => ({
  kind,
  localName: localNode.text(),
  localNode,
  definitionStart: definitionNode.range().start.index,
  definitionEnd: definitionNode.range().end.index,
  referenceStarts: collectReferences(localNode, filename),
  migration,
})

const resolvesToBinding = (node: Node, binding: Binding): boolean => {
  if (node.text() !== binding.localName) return false
  if (binding.referenceStarts.has(node.range().start.index)) return true
  if (sameRange(node, binding.localNode)) return true

  const definition = node.definition({ resolveExternal: false })
  if (!definition) return false

  const definitionRange = definition.node.range()
  return (
    definitionRange.start.index === binding.definitionStart ||
    (definition.kind === 'local' && isInsideRange(definition.node, binding.definitionStart, binding.definitionEnd))
  )
}

const sourcePositionFinding = (node: Node, path: string, rule: MigrationRule, reason: string): AuditCandidate => {
  const range = node.range()
  return {
    startPos: range.start.index,
    endPos: range.end.index,
    ruleId: rule.id,
    path,
    line: range.start.line + 1,
    column: range.start.column + 1,
    reason,
    guideUrl: rule.guideUrl,
  }
}

const addEdit = (
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  node: Node,
  insertedText: string,
  atomicGroup: string,
  rule: MigrationRule,
): void => {
  const range = node.range()
  candidates.push({
    startPos: range.start.index,
    endPos: range.end.index,
    insertedText,
    atomicGroup,
    ruleId: rule.id,
  })
  groups.set(atomicGroup, { node, rule })
}

const transparentExpression = (node: Node): Node => {
  let current = node
  const transparentKinds = new Set([
    'await_expression',
    'parenthesized_expression',
    'as_expression',
    'satisfies_expression',
    'type_assertion',
  ])

  while (transparentKinds.has(nodeKind(current))) {
    const next =
      nodeField(current, 'expression') ??
      nodeField(current, 'argument') ??
      current.children().find((child) => child.isNamed()) ??
      null
    if (!next) break
    current = next
  }

  return current
}

const dynamicImportSource = (node: Node): Node | null => {
  const unwrapped = transparentExpression(node)
  if (unwrapped.kind() !== 'call_expression') return null
  const callee = nodeField(unwrapped, 'function')
  if (callee?.kind() !== 'import') return null
  const args = nodeField(unwrapped, 'arguments')
  if (!args) return null
  return args.children().find((child) => child.kind() === 'string') ?? null
}

const callArguments = (call: Node): Node[] => {
  const args = nodeField(call, 'arguments')
  return args ? args.children().filter((child) => child.isNamed()) : []
}

const bindingLocalNode = (pattern: Node): Node | null => {
  if (pattern.kind() === 'shorthand_property_identifier_pattern' || pattern.kind() === 'identifier') return pattern
  if (pattern.kind() !== 'pair_pattern') return null

  let value = nodeField(pattern, 'value')
  if (!value) return null
  if (value.kind() === 'assignment_pattern') value = nodeField(value, 'left')
  return value && (value.kind() === 'identifier' || value.kind() === 'shorthand_property_identifier_pattern')
    ? value
    : null
}

const patternImportedName = (pattern: Node): string | null => {
  if (pattern.kind() === 'shorthand_property_identifier_pattern') return pattern.text()
  if (pattern.kind() !== 'pair_pattern') return null
  return nodeField(pattern, 'key')?.text() ?? null
}

const discoverGeneratorBindings = (rootNode: Node, filename: string): Binding[] => {
  const bindings: Binding[] = []

  for (const statement of findAll(rootNode, 'import_statement')) {
    const migration = GENERATOR_BY_MODULE.get(stringValue(nodeField(statement, 'source')) ?? '')
    if (!migration) continue

    for (const specifier of findAll(statement, 'import_specifier')) {
      if (nodeField(specifier, 'name')?.text() !== migration.exportName) continue
      const localNode = nodeField(specifier, 'alias') ?? nodeField(specifier, 'name')
      if (localNode) bindings.push(createBinding('named', localNode, statement, migration, filename))
    }

    for (const namespaceImport of findAll(statement, 'namespace_import')) {
      const localNode = namespaceImport.children().find((child) => child.kind() === 'identifier')
      if (localNode) bindings.push(createBinding('namespace', localNode, statement, migration, filename))
    }
  }

  for (const declarator of findAll(rootNode, 'variable_declarator')) {
    const value = nodeField(declarator, 'value')
    const source = value ? dynamicImportSource(value) : null
    const migration = GENERATOR_BY_MODULE.get(stringValue(source) ?? '')
    const name = nodeField(declarator, 'name')
    if (!migration || !name || name.kind() !== 'object_pattern') continue

    for (const pattern of name.children()) {
      if (patternImportedName(pattern) !== migration.exportName) continue
      const localNode = bindingLocalNode(pattern)
      if (localNode) bindings.push(createBinding('named', localNode, declarator, migration, filename))
    }
  }

  return bindings
}

const migrationForCallee = (callee: Node, bindings: readonly Binding[]): GeneratorMigration | null => {
  if (callee.kind() === 'identifier') {
    return bindings.find((binding) => binding.kind === 'named' && resolvesToBinding(callee, binding))?.migration ?? null
  }

  if (callee.kind() !== 'member_expression') return null
  const object = nodeField(callee, 'object')
  const property = nodeField(callee, 'property')
  if (!object || !property) return null

  const namespaceBinding = bindings.find(
    (binding) =>
      binding.kind === 'namespace' &&
      property.text() === binding.migration.exportName &&
      resolvesToBinding(object, binding),
  )
  if (namespaceBinding) return namespaceBinding.migration

  const source = dynamicImportSource(object)
  const migration = GENERATOR_BY_MODULE.get(stringValue(source) ?? '')
  return migration && property.text() === migration.exportName ? migration : null
}

const propertyKey = (property: Node): Node | null => {
  if (property.kind() === 'pair') return nodeField(property, 'key')
  return property.kind() === 'shorthand_property_identifier' ? property : null
}

const staticPropertyName = (property: Node): string | null => {
  const key = propertyKey(property)
  if (!key || key.kind() === 'computed_property_name') return null
  return stringValue(key) ?? key.text()
}

const computedLiteralPropertyName = (property: Node): string | null => {
  const key = propertyKey(property)
  if (key?.kind() !== 'computed_property_name') return null
  const expression = nodeField(key, 'expression') ?? key.children().find((child) => child.isNamed()) ?? null
  return expression ? stringValue(transparentExpression(expression)) : null
}

const needsTimestampParentheses = (value: Node): boolean =>
  !new Set([
    'call_expression',
    'identifier',
    'member_expression',
    'number',
    'parenthesized_expression',
    'subscript_expression',
    'unary_expression',
  ]).has(nodeKind(value))

const processOptionCall = (
  call: Node,
  migration: GeneratorMigration,
  path: string,
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  audits: AuditCandidate[],
): void => {
  const argument = callArguments(call)[migration.optionIndex]
  if (!argument) return
  if (argument.kind() !== 'object') {
    if (migration.exportName !== 'nanoid') {
      audits.push(
        sourcePositionFinding(
          argument,
          path,
          migration.rule,
          `The ${migration.exportName} options are not an inline object, so ${migration.sourceKey} cannot be migrated safely.`,
        ),
      )
    }
    return
  }

  const properties = argument.children().filter((child) => child.isNamed())
  const sourceProperties = properties.filter((property) => staticPropertyName(property) === migration.sourceKey)
  const computedSourceProperties = properties.filter(
    (property) => computedLiteralPropertyName(property) === migration.sourceKey,
  )
  const affectedSourceProperties = [...sourceProperties, ...computedSourceProperties]
  if (affectedSourceProperties.length === 0) return

  const hasDestination = properties.some((property) => staticPropertyName(property) === migration.targetKey)
  const hasComputedKey = properties.some((property) => propertyKey(property)?.kind() === 'computed_property_name')
  const hasSpread = properties.some((property) => property.kind() === 'spread_element')

  if (hasDestination || hasComputedKey || hasSpread) {
    const reason = hasDestination
      ? `The options already contain ${migration.targetKey}; changing ${migration.sourceKey} could change precedence.`
      : hasComputedKey
        ? `A computed option key makes ${migration.sourceKey} precedence ambiguous.`
        : `An object spread makes ${migration.sourceKey} precedence ambiguous.`

    for (const property of affectedSourceProperties)
      audits.push(sourcePositionFinding(propertyKey(property)!, path, migration.rule, reason))
    return
  }

  for (const property of sourceProperties) {
    const group = `option:${call.range().start.index}:${property.range().start.index}`
    const key = propertyKey(property)!

    if (property.kind() === 'shorthand_property_identifier') {
      const multiplier = migration.multiplyByThousand ? ' * 1000' : ''
      addEdit(
        candidates,
        groups,
        property,
        `${migration.targetKey}: ${migration.sourceKey}${multiplier}`,
        group,
        migration.rule,
      )
      continue
    }

    const value = nodeField(property, 'value')
    if (!value) {
      audits.push(
        sourcePositionFinding(
          property,
          path,
          migration.rule,
          `The ${migration.sourceKey} value could not be read safely.`,
        ),
      )
      continue
    }

    const targetKey =
      stringValue(key) === migration.sourceKey ? replacementForString(key, migration.targetKey) : migration.targetKey
    addEdit(candidates, groups, key, targetKey, group, migration.rule)
    if (migration.multiplyByThousand) {
      const original = value.text()
      const operand = needsTimestampParentheses(value) ? `(${original})` : original
      addEdit(candidates, groups, value, `${operand} * 1000`, group, migration.rule)
    }
  }
}

const cuidv2CollisionExists = (rootNode: Node): boolean =>
  rootNode.findAll({ rule: { regex: '^cuidv2$' } }).some((node) => node.text() === 'cuidv2')

const referencesForRename = (localNode: Node, filename: string): Node[] =>
  localNode
    .references()
    .filter((fileReferences) => fileReferences.root.filename() === filename)
    .flatMap((fileReferences) => fileReferences.nodes)
    .filter((reference) => reference.text() === localNode.text())

const processCuidImports = (
  rootNode: Node,
  filename: string,
  path: string,
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  audits: AuditCandidate[],
  scheduledSourceStarts: Set<number>,
): void => {
  for (const statement of findAll(rootNode, 'import_statement')) {
    const source = nodeField(statement, 'source')
    if (!source || stringValue(source) !== 'uniku/cuid2') continue
    const group = `cuid-import:${statement.range().start.index}`
    const specifiers = findAll(statement, 'import_specifier')
    const namespaces = findAll(statement, 'namespace_import')

    if (specifiers.length === 1 && namespaces.length === 0 && nodeField(specifiers[0]!, 'name')?.text() === 'cuid2') {
      const specifier = specifiers[0]!
      const importedName = nodeField(specifier, 'name')!
      const alias = nodeField(specifier, 'alias')
      const localNode = alias ?? importedName

      if (!alias && cuidv2CollisionExists(rootNode)) {
        scheduledSourceStarts.add(source.range().start.index)
        audits.push(
          sourcePositionFinding(
            importedName,
            path,
            RULES.cuid,
            'The file already declares or references cuidv2, so renaming cuid2 could capture a different binding.',
          ),
        )
        continue
      }

      addEdit(candidates, groups, source, replacementForString(source, 'uniku/cuid/v2'), group, RULES.cuid)
      addEdit(candidates, groups, importedName, 'cuidv2', group, RULES.cuid)
      scheduledSourceStarts.add(source.range().start.index)

      if (!alias) {
        for (const reference of referencesForRename(localNode, filename)) {
          addEdit(candidates, groups, reference, 'cuidv2', group, RULES.cuid)
        }
      }
      continue
    }

    if (specifiers.length === 0 && namespaces.length === 1) {
      const namespace = namespaces[0]!
      const localNode = namespace.children().find((child) => child.kind() === 'identifier')
      if (!localNode) continue
      const references = referencesForRename(localNode, filename)
      const propertyNodes: Node[] = []
      let unsupportedReference: Node | null = null

      for (const reference of references) {
        const parent = reference.parent()
        const object = parent ? nodeField(parent, 'object') : null
        if (parent?.kind() !== 'member_expression' || !object || !sameRange(object, reference)) {
          unsupportedReference = reference
          break
        }
        const property = nodeField(parent, 'property')
        if (property?.text() !== 'cuid2') {
          unsupportedReference = reference
          break
        }
        propertyNodes.push(property)
      }

      if (unsupportedReference) {
        scheduledSourceStarts.add(source.range().start.index)
        audits.push(
          sourcePositionFinding(
            unsupportedReference,
            path,
            RULES.cuid,
            'The legacy CUID namespace has a use other than direct .cuid2 access.',
          ),
        )
        continue
      }

      addEdit(candidates, groups, source, replacementForString(source, 'uniku/cuid/v2'), group, RULES.cuid)
      scheduledSourceStarts.add(source.range().start.index)
      for (const property of propertyNodes) addEdit(candidates, groups, property, 'cuidv2', group, RULES.cuid)
      continue
    }

    scheduledSourceStarts.add(source.range().start.index)
    audits.push(
      sourcePositionFinding(source, path, RULES.cuid, 'This legacy CUID import shape cannot be migrated atomically.'),
    )
  }
}

const processCuidReexports = (
  rootNode: Node,
  path: string,
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  audits: AuditCandidate[],
  scheduledSourceStarts: Set<number>,
): void => {
  for (const statement of findAll(rootNode, 'export_statement')) {
    const source = nodeField(statement, 'source')
    if (!source || stringValue(source) !== 'uniku/cuid2') continue
    const specifiers = findAll(statement, 'export_specifier')

    if (specifiers.length !== 1 || nodeField(specifiers[0]!, 'name')?.text() !== 'cuid2') {
      scheduledSourceStarts.add(source.range().start.index)
      audits.push(
        sourcePositionFinding(
          source,
          path,
          RULES.cuid,
          'This legacy CUID re-export shape cannot be migrated atomically.',
        ),
      )
      continue
    }

    const group = `cuid-reexport:${statement.range().start.index}`
    addEdit(candidates, groups, source, replacementForString(source, 'uniku/cuid/v2'), group, RULES.cuid)
    addEdit(candidates, groups, nodeField(specifiers[0]!, 'name')!, 'cuidv2', group, RULES.cuid)
    scheduledSourceStarts.add(source.range().start.index)
  }
}

const dynamicImportDeclarator = (call: Node): Node | null => {
  for (const ancestor of call.ancestors()) {
    if (ancestor.kind() === 'variable_declarator') {
      const value = nodeField(ancestor, 'value')
      return value && sameRange(transparentExpression(value), call) ? ancestor : null
    }
    if (
      !['await_expression', 'parenthesized_expression', 'as_expression', 'satisfies_expression'].includes(
        nodeKind(ancestor),
      )
    ) {
      break
    }
  }
  return null
}

const immediateDynamicMember = (call: Node): Node | null => {
  let current = call
  for (const ancestor of call.ancestors()) {
    if (
      ['await_expression', 'parenthesized_expression', 'as_expression', 'satisfies_expression'].includes(
        nodeKind(ancestor),
      )
    ) {
      current = ancestor
      continue
    }
    return ancestor.kind() === 'member_expression' && sameRange(nodeField(ancestor, 'object')!, current)
      ? ancestor
      : null
  }
  return null
}

const processCuidDynamicImports = (
  rootNode: Node,
  filename: string,
  path: string,
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  audits: AuditCandidate[],
  scheduledSourceStarts: Set<number>,
): void => {
  for (const call of findAll(rootNode, 'call_expression')) {
    const source = dynamicImportSource(call)
    if (!source || stringValue(source) !== 'uniku/cuid2') continue
    const group = `cuid-dynamic:${call.range().start.index}`
    const member = immediateDynamicMember(call)

    if (member && nodeField(member, 'property')?.text() === 'cuid2') {
      addEdit(candidates, groups, source, replacementForString(source, 'uniku/cuid/v2'), group, RULES.cuid)
      addEdit(candidates, groups, nodeField(member, 'property')!, 'cuidv2', group, RULES.cuid)
      scheduledSourceStarts.add(source.range().start.index)
      continue
    }

    const declarator = dynamicImportDeclarator(call)
    const pattern = declarator ? nodeField(declarator, 'name') : null
    const entries = pattern?.kind() === 'object_pattern' ? pattern.children().filter((child) => child.isNamed()) : []

    if (declarator && entries.length === 1 && patternImportedName(entries[0]!) === 'cuid2') {
      const entry = entries[0]!
      const localNode = bindingLocalNode(entry)
      if (!localNode) continue
      const isAliased = entry.kind() === 'pair_pattern'

      if (!isAliased && cuidv2CollisionExists(rootNode)) {
        scheduledSourceStarts.add(source.range().start.index)
        audits.push(
          sourcePositionFinding(
            entry,
            path,
            RULES.cuid,
            'The file already declares or references cuidv2, so renaming cuid2 could capture a different binding.',
          ),
        )
        continue
      }

      addEdit(candidates, groups, source, replacementForString(source, 'uniku/cuid/v2'), group, RULES.cuid)
      const importedNode = entry.kind() === 'pair_pattern' ? nodeField(entry, 'key')! : entry
      addEdit(candidates, groups, importedNode, 'cuidv2', group, RULES.cuid)
      scheduledSourceStarts.add(source.range().start.index)

      if (!isAliased) {
        for (const reference of referencesForRename(localNode, filename)) {
          addEdit(candidates, groups, reference, 'cuidv2', group, RULES.cuid)
        }
      }
      continue
    }

    scheduledSourceStarts.add(source.range().start.index)
    audits.push(
      sourcePositionFinding(
        source,
        path,
        RULES.cuid,
        'This dynamic CUID import is not immediate member access or destructuring.',
      ),
    )
  }
}

interface PropertyAccess {
  readonly member: Node
  readonly receiver: Node
}

const binaryOperator = (node: Node): string | null => nodeField(node, 'operator')?.text() ?? null

const nonComputedPropertyAccess = (node: Node, propertyName: string): PropertyAccess | null => {
  const member = transparentExpression(node)
  if (member.kind() !== 'member_expression' || member.text().includes('?.')) return null

  const property = nodeField(member, 'property')
  const receiver = nodeField(member, 'object')
  if (!property || property.text() !== propertyName || !receiver) return null
  if (
    receiver.kind() === 'call_expression' ||
    findAll(receiver, 'call_expression').length > 0 ||
    findAll(receiver, 'subscript_expression').length > 0 ||
    receiver.text().includes('?.')
  ) {
    return null
  }
  if (!['identifier', 'member_expression', 'parenthesized_expression', 'this'].includes(nodeKind(receiver))) return null

  return { member, receiver }
}

const equalityLiteral = (node: Node): { readonly access: PropertyAccess; readonly literal: Node } | null => {
  if (node.kind() !== 'binary_expression') return null
  const left = nodeField(node, 'left')
  const right = nodeField(node, 'right')
  if (!left || !right) return null

  const leftAccess = nonComputedPropertyAccess(left, 'strategy')
  const rightAccess = nonComputedPropertyAccess(right, 'strategy')
  if (leftAccess && stringValue(transparentExpression(right)) !== null) {
    return { access: leftAccess, literal: transparentExpression(right) }
  }
  if (rightAccess && stringValue(transparentExpression(left)) !== null) {
    return { access: rightAccess, literal: transparentExpression(left) }
  }
  return null
}

const flattenConjuncts = (node: Node): Node[] => {
  const expression = transparentExpression(node)
  if (expression.kind() !== 'binary_expression' || binaryOperator(expression) !== '&&') return [expression]
  const left = nodeField(expression, 'left')
  const right = nodeField(expression, 'right')
  return left && right ? [...flattenConjuncts(left), ...flattenConjuncts(right)] : [expression]
}

const containingConjunction = (comparison: Node): Node | null => {
  let current = comparison
  let conjunction: Node | null = null

  for (const ancestor of comparison.ancestors()) {
    if (ancestor.kind() === 'parenthesized_expression') {
      current = ancestor
      continue
    }
    if (ancestor.kind() !== 'binary_expression' || binaryOperator(ancestor) !== '&&') break
    const left = nodeField(ancestor, 'left')
    const right = nodeField(ancestor, 'right')
    if (
      (!left || !isInsideRange(current, left.range().start.index, left.range().end.index)) &&
      (!right || !isInsideRange(current, right.range().start.index, right.range().end.index))
    ) {
      break
    }
    conjunction = ancestor
    current = ancestor
  }

  return conjunction
}

const strategyConjunctState = (
  comparison: Node,
  receiverText: string,
  expectedStrategy: string,
): 'absent' | 'matching' | 'conflicting' => {
  const conjunction = containingConjunction(comparison)
  if (!conjunction) return 'absent'

  let matching = false
  for (const conjunct of flattenConjuncts(conjunction)) {
    if (sameRange(conjunct, comparison)) continue
    const predicate = equalityLiteral(conjunct)
    if (!predicate || predicate.access.receiver.text() !== receiverText) continue

    if (binaryOperator(conjunct) === '===' && stringValue(predicate.literal) === expectedStrategy) matching = true
    else return 'conflicting'
  }

  return matching ? 'matching' : 'absent'
}

const comparisonWithTargetCode = (comparison: Node, literal: Node, targetCode: string): string => {
  const comparisonRange = comparison.range()
  const literalRange = literal.range()
  const start = literalRange.start.index - comparisonRange.start.index
  const end = literalRange.end.index - comparisonRange.start.index
  return `${comparison.text().slice(0, start)}${replacementForString(literal, targetCode)}${comparison.text().slice(end)}`
}

const processErrorComparisons = (
  rootNode: Node,
  path: string,
  candidates: PlannedEdit[],
  groups: Map<string, GroupMetadata>,
  audits: AuditCandidate[],
  handledLegacyStarts: Set<number>,
): void => {
  for (const comparison of findAll(rootNode, 'binary_expression')) {
    if (binaryOperator(comparison) !== '===') continue
    const left = nodeField(comparison, 'left')
    const right = nodeField(comparison, 'right')
    if (!left || !right) continue

    const leftLiteral = transparentExpression(left)
    const rightLiteral = transparentExpression(right)
    const leftMigration = ERROR_CODE_BY_SOURCE.get(stringValue(leftLiteral) ?? '')
    const rightMigration = ERROR_CODE_BY_SOURCE.get(stringValue(rightLiteral) ?? '')
    const literal = leftMigration ? leftLiteral : rightMigration ? rightLiteral : null
    const migration = leftMigration ?? rightMigration
    if (!literal || !migration) continue

    const otherOperand = leftMigration ? right : left
    const codeAccess = nonComputedPropertyAccess(otherOperand, 'code')
    handledLegacyStarts.add(literal.range().start.index)
    if (!codeAccess) {
      audits.push(
        sourcePositionFinding(
          literal,
          path,
          RULES.error,
          'The legacy code is not compared with a recoverable, non-computed .code receiver.',
        ),
      )
      continue
    }

    const strategyState = strategyConjunctState(comparison, codeAccess.receiver.text(), migration.strategy)
    if (strategyState === 'conflicting') {
      audits.push(
        sourcePositionFinding(
          literal,
          path,
          RULES.error,
          'The surrounding conjunction already checks a different strategy for this receiver.',
        ),
      )
      continue
    }

    const group = `error-comparison:${comparison.range().start.index}`
    if (strategyState === 'matching') {
      addEdit(candidates, groups, literal, replacementForString(literal, migration.targetCode), group, RULES.error)
      continue
    }

    const quote = literal.text()[0]
    const codeComparison = comparisonWithTargetCode(comparison, literal, migration.targetCode)
    const replacement = `(${codeComparison} && ${codeAccess.receiver.text()}.strategy === ${quote}${migration.strategy}${quote})`
    addEdit(candidates, groups, comparison, replacement, group, RULES.error)
  }
}

const unsupportedLegacyReason = (literal: Node): string => {
  const ancestors = literal.ancestors()
  const binary = ancestors.find((ancestor) => ancestor.kind() === 'binary_expression')
  if (binary) {
    const operator = binaryOperator(binary)
    if (operator !== '===') return `The ${operator ?? 'unknown'} comparison is not a strict positive equality.`
  }
  if (ancestors.some((ancestor) => ancestor.kind() === 'switch_case')) {
    return 'Switch labels require case-specific manual migration.'
  }
  if (ancestors.some((ancestor) => ancestor.kind() === 'array')) {
    return 'Legacy codes stored in arrays require data-flow-aware manual migration.'
  }
  if (ancestors.some((ancestor) => ['pair', 'object'].includes(nodeKind(ancestor)))) {
    return 'Legacy codes stored in lookup objects require data-flow-aware manual migration.'
  }
  if (ancestors.some((ancestor) => ['object_pattern', 'pair_pattern'].includes(nodeKind(ancestor)))) {
    return 'Destructured legacy codes require data-flow-aware manual migration.'
  }
  if (ancestors.some((ancestor) => ancestor.kind() === 'variable_declarator')) {
    return 'Legacy codes stored in variables require data-flow-aware manual migration.'
  }
  return 'This legacy code is not used in a supported direct .code equality.'
}

const auditUnsupportedErrorCodes = (
  rootNode: Node,
  path: string,
  audits: AuditCandidate[],
  handledLegacyStarts: ReadonlySet<number>,
): void => {
  for (const literal of findAll(rootNode, 'string')) {
    const migration: ErrorCodeMigration | undefined = ERROR_CODE_BY_SOURCE.get(stringValue(literal) ?? '')
    if (!migration || handledLegacyStarts.has(literal.range().start.index)) continue
    audits.push(sourcePositionFinding(literal, path, RULES.error, unsupportedLegacyReason(literal)))
  }
}

const auditUnsupportedModuleUses = (
  rootNode: Node,
  path: string,
  audits: AuditCandidate[],
  scheduledSourceStarts: ReadonlySet<number>,
): void => {
  for (const source of findAll(rootNode, 'string')) {
    const value = stringValue(source)
    if (!value || scheduledSourceStarts.has(source.range().start.index)) continue

    if (value === 'uniku/cuid2') {
      audits.push(
        sourcePositionFinding(
          source,
          path,
          RULES.cuid,
          'The retired uniku/cuid2 module remains in an unsupported construct.',
        ),
      )
      continue
    }

    const migration = GENERATOR_BY_MODULE.get(value)
    if (!migration) continue
    const call = source.ancestors().find((ancestor) => ancestor.kind() === 'call_expression')
    if (call && nodeField(call, 'function')?.text() === 'require') {
      audits.push(
        sourcePositionFinding(
          source,
          path,
          migration.rule,
          'Static require() is unsupported because uniku is ESM-only.',
        ),
      )
    }
  }

  for (const statement of findAll(rootNode, 'import_statement')) {
    const source = stringValue(nodeField(statement, 'source'))
    if (!source?.startsWith('.')) continue
    for (const specifier of findAll(statement, 'import_specifier')) {
      if (nodeField(specifier, 'name')?.text() === 'cuid2') {
        audits.push(
          sourcePositionFinding(
            nodeField(specifier, 'name')!,
            path,
            RULES.cuid,
            'A cuid2 import behind a local re-export is not followed across files.',
          ),
        )
      }
    }
  }
}

const codemod: Codemod<TypesMap> = async (root) => {
  const rootNode = root.root()
  const path = root.relativeFilename()
  const candidates: PlannedEdit[] = []
  const groups = new Map<string, GroupMetadata>()
  const audits: AuditCandidate[] = []
  const scheduledSourceStarts = new Set<number>()
  const handledLegacyStarts = new Set<number>()

  processCuidImports(rootNode, root.filename(), path, candidates, groups, audits, scheduledSourceStarts)
  processCuidReexports(rootNode, path, candidates, groups, audits, scheduledSourceStarts)
  processCuidDynamicImports(rootNode, root.filename(), path, candidates, groups, audits, scheduledSourceStarts)

  const bindings = discoverGeneratorBindings(rootNode, root.filename())
  for (const call of findAll(rootNode, 'call_expression')) {
    const callee = nodeField(call, 'function')
    if (!callee) continue
    const migration = migrationForCallee(callee, bindings)
    if (migration) processOptionCall(call, migration, path, candidates, groups, audits)
  }

  processErrorComparisons(rootNode, path, candidates, groups, audits, handledLegacyStarts)

  auditUnsupportedModuleUses(rootNode, path, audits, scheduledSourceStarts)
  auditUnsupportedErrorCodes(rootNode, path, audits, handledLegacyStarts)

  const editPlan = planEdits(candidates)
  for (const groupId of editPlan.rejectedGroupIds) {
    const metadata = groups.get(groupId)
    if (metadata) {
      audits.push(
        sourcePositionFinding(
          metadata.node,
          path,
          RULES.overlap,
          `Overlapping edits made the ${metadata.rule.id} atomic migration unsafe.`,
        ),
      )
    }
  }

  const findings = classifyAuditCandidates(audits)
  for (const finding of findings) {
    manualMigrationMetric.increment({ ruleId: finding.ruleId })
    console.log(renderAuditFinding(finding))
  }

  return editPlan.edits.length > 0 ? rootNode.commitEdits([...editPlan.edits]) : null
}

export default codemod

export const supportedGeneratorMigrations: readonly GeneratorMigration[] = GENERATOR_MIGRATIONS
