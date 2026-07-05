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
  // command instead of the resolved subcommand (internal/parser.ts keeps
  // `trailingOperands` at the level that lexed them and recurses with `[]`).
  // Encode post-`--` operands for commands whose public contract accepts a
  // literal positional ID — the prefix stops them from parsing as flags —
  // then drop the marker so the parser routes them to the selected
  // subcommand. Commands decode with `decodePreprocessedArg`.
  if (doubleDash !== -1 && acceptsLiteralIdOperand(result.slice(0, doubleDash))) {
    return [...result.slice(0, doubleDash), ...result.slice(doubleDash + 1).map(encodeLiteralArg)]
  }

  return result
}

const literalArgPrefix = '\0uniku-literal:'
const literalIdCommands = new Set(['inspect', 'validate'])

// The built-in global flags whose value is a separate token (`--log-level
// info`). Mirrors the value-taking entries of `GlobalFlag.BuiltIns` in the
// pinned effect beta (the published dist exposes no way to derive them);
// re-check this list when bumping the beta.
const valueTakingGlobalFlags = new Set(['--completions', '--log-level'])

export function decodePreprocessedArg(arg: string): string {
  return arg.startsWith(literalArgPrefix) ? arg.slice(literalArgPrefix.length) : arg
}

function encodeLiteralArg(arg: string): string {
  return `${literalArgPrefix}${arg}`
}

/**
 * Whether the first command-like token (skipping global flags and their
 * values) is a command that takes a literal positional ID.
 */
function acceptsLiteralIdOperand(argsBeforeDoubleDash: readonly string[]): boolean {
  for (let index = 0; index < argsBeforeDoubleDash.length; index += 1) {
    const arg = argsBeforeDoubleDash[index]

    if (arg.startsWith('-')) {
      // `--flag=value` is a single token; `--flag value` needs its value skipped.
      if (valueTakingGlobalFlags.has(arg)) {
        index += 1
      }
      continue
    }

    return literalIdCommands.has(arg)
  }

  return false
}
