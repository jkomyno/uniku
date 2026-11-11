/**
 * Normalizes user-facing CLI arguments (everything after the executable and
 * script path) before they reach Command.runWith.
 *
 * Rewrites -V to --version, because the built-in version flag only aliases
 * -v. Tokens after `--` are literal operands, so only the tokens before it
 * are rewritten.
 */
export function preprocessArgs(args: readonly string[]): string[] {
  const doubleDash = args.indexOf('--')
  const head = doubleDash === -1 ? args : args.slice(0, doubleDash)
  const endOfOptions = doubleDash === -1 ? [] : args.slice(doubleDash)

  return [...head.map((arg) => (arg === '-V' ? '--version' : arg)), ...endOfOptions]
}

/** Whether `flag` appears as an option, not as a literal operand after `--`. */
export function hasOptionToken(args: readonly string[], flag: string): boolean {
  const doubleDash = args.indexOf('--')
  return (doubleDash === -1 ? args : args.slice(0, doubleDash)).includes(flag)
}
