/**
 * Normalizes user-facing CLI arguments (everything after the executable and
 * script path) before they reach Command.runWith.
 */
export function preprocessArgs(args: readonly string[]): string[] {
  const doubleDash = args.indexOf('--')

  // Replace -V with --version (the built-in version flag only aliases -v),
  // but never past the end-of-options marker — post-`--` tokens are literal.
  const result = args.map((arg, index) =>
    arg === '-V' && (doubleDash === -1 || index < doubleDash) ? '--version' : arg,
  )

  // Effect v4's parser attaches operands found after `--` to the parent
  // command instead of the resolved subcommand. Encode post-`--` operands for
  // commands whose public contract accepts a literal positional ID, then drop
  // the marker so the parser routes them to the selected subcommand.
  if (doubleDash !== -1 && acceptsLiteralIdOperand(result.slice(0, doubleDash))) {
    return [...result.slice(0, doubleDash), ...result.slice(doubleDash + 1).map(encodeLiteralArg)]
  }

  return result
}

const literalArgPrefix = '\0uniku-literal:'
const literalIdCommands = new Set(['inspect', 'validate'])
const valueTakingGlobalFlags = new Set(['--completions', '--log-level'])
const valueTakingGlobalFlagAssignments = ['--completions=', '--log-level='] as const

export function decodePreprocessedArg(arg: string): string {
  return arg.startsWith(literalArgPrefix) ? arg.slice(literalArgPrefix.length) : arg
}

function encodeLiteralArg(arg: string): string {
  return `${literalArgPrefix}${arg}`
}

function acceptsLiteralIdOperand(argsBeforeDoubleDash: readonly string[]): boolean {
  for (let index = 0; index < argsBeforeDoubleDash.length; index += 1) {
    const arg = argsBeforeDoubleDash[index]

    if (valueTakingGlobalFlags.has(arg)) {
      index += 1
      continue
    }
    if (valueTakingGlobalFlagAssignments.some((prefix) => arg.startsWith(prefix))) {
      continue
    }
    if (arg.startsWith('-')) {
      continue
    }

    return literalIdCommands.has(arg)
  }

  return false
}
