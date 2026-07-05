import { makeCliRunner } from '@/src/commands'
import { preprocessArgs } from '@/src/runtime/args'

const run = makeCliRunner('0.0.0-test')

/**
 * Run the CLI in a test environment, through the same argument
 * preprocessing the production entrypoint applies.
 * Pass only the user-facing args (e.g., ['generate', 'uuid', '-n', '3']).
 */
export const cli = (args: ReadonlyArray<string>) => run(preprocessArgs(args))
