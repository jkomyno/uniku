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
  // command instead of the resolved subcommand, so `validate -- <id>` would
  // lose its id. When no post-`--` token looks like a flag, dropping the
  // marker is lexically equivalent and restores the v3 routing. Operands that
  // do start with `-` keep the marker and remain subject to the upstream
  // limitation.
  if (doubleDash !== -1 && result.slice(doubleDash + 1).every((arg) => !arg.startsWith('-'))) {
    result.splice(doubleDash, 1)
  }

  return result
}
