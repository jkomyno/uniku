import { CliConfig, GlobalFlag } from 'effect/cli'

/**
 * The built-in global flags: help, version, shell completions, and log level.
 * Effect 4.1 also enables an interactive `--wizard` by default, which uniku
 * leaves out.
 */
export const UnikuCliConfig: CliConfig.CliConfig.Service = CliConfig.make({
  builtIns: [GlobalFlag.Help, GlobalFlag.Version, GlobalFlag.Completions, GlobalFlag.LogLevel],
})
