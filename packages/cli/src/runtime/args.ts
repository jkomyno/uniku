/**
 * Normalizes user-facing CLI arguments (everything after the executable and
 * script path) before they reach Command.runWith.
 */
export function preprocessArgs(args: readonly string[]): string[] {
  const doubleDash = args.indexOf('--')

  // Rewrite -V to --version (the built-in version flag only aliases -v).
  // Post-`--` tokens are literal, so only the head is rewritten.
  const head = (doubleDash === -1 ? args : args.slice(0, doubleDash)).map((arg) => (arg === '-V' ? '--version' : arg))

  if (doubleDash === -1) {
    return head
  }

  // Effect v4's parser attaches operands found after `--` to the parent
  // command instead of the resolved subcommand (internal/parser.ts keeps
  // `trailingOperands` at the level that lexed them and recurses with `[]`).
  // For commands whose public contract accepts a literal positional ID,
  // encode each operand — the prefix stops it from parsing as a flag — and
  // drop the marker so the parser routes it to the selected subcommand.
  // Commands decode with `decodePreprocessedArg`.
  const operands = args.slice(doubleDash + 1)
  return acceptsLiteralIdOperand(head) ? [...head, ...operands.map(encodeLiteralArg)] : [...head, '--', ...operands]
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
