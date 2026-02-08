import { makeCliRunner } from '@/src/commands'

const run = makeCliRunner('0.0.0-test')

/**
 * Run the CLI in a test environment.
 * Pass only the user-facing args (e.g., ['generate', 'uuid', '-n', '3']).
 */
export const cli = (args: ReadonlyArray<string>) => run(['node', '<CMD>', ...args])
