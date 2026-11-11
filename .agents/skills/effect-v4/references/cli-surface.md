# Effect CLI in uniku

The framework lives in `effect/cli`. The installed `effect@4.1.x` typings decide what
compiles; `packages/cli/src/commands/index.ts` and `src/runtime/cli-failure.ts` decide how
uniku uses it.

## Command layout

Each command owns a directory under `packages/cli/src/commands/`:

```text
commands/
  index.ts                       # rootCmd and makeCliRunner
  inspect/
    inspect.cmd.ts               # flags, argument, description, examples
    inspect.handler.ts           # InspectParams + runInspect
  validate/
    validate.cmd.ts
    validate.handler.ts
  generate/
    generate.cmd.ts              # the `generate` group and generateSubcommands
    generate.flags.ts            # flags several subcommands share
    generate.parse.ts            # --timestamp / --node / --node-bits parsing
    uuid/
      generate.uuid.cmd.ts       # generateCmd$Uuid
      generate.uuid.handler.ts   # GenerateUuidParams + runGenerateUuid
    ...                          # one directory per ID type
```

- A `.cmd.ts` file declares the flags and arguments and passes an imported handler to
  `Command.make`. It holds no logic.
- A `.handler.ts` file exports a plain `...Params` type and a `run...` handler built with
  `Effect.fn('cli.<path>')`. Handlers take `Option` values for optional flags.
- A subcommand is named `<group>Cmd$<Sub>` (`generateCmd$Uuid`); a top-level command is
  `<name>Cmd` (`inspectCmd`).
- Root shorthands reuse the same `Command` value: `rootCmd` registers
  `...generateSubcommands` next to `generateCmd`, so `uniku uuid` and
  `uniku generate uuid` run the same definition.

A command definition, from `packages/cli/src/commands/generate/typeid/generate.typeid.cmd.ts`:

```ts no-check
const prefix = Flag.String('prefix').pipe(
  Flag.withAlias('p'),
  Flag.withDescription('Type prefix, e.g. "user" for user_... (empty by default)'),
  Flag.withDefault(''),
)

export const generateCmd$Typeid = Command.make(
  'typeid',
  { count: countFlag, json: jsonFlag, prefix },
  runGenerateTypeid,
).pipe(
  Command.withDescription('Generate TypeIDs'),
  Command.withExamples([
    { command: 'uniku typeid --prefix user', description: 'Generate a TypeID such as user_...' },
  ]),
)
```

## Flags and arguments

Constructors are capitalized; combinators are lowercase. Named options use `Flag.String`,
`Flag.Boolean`, `Flag.Int`, `Flag.Literals`, or `Flag.ChoiceWithValue`; positionals use
`Argument.String`. Defaults, aliases, and descriptions belong in the declaration so help
and parsing agree. Optional flags and arguments produce `Option` values.

```ts
import { Effect, Option } from 'effect'
import { Argument, Command, Flag } from 'effect/cli'

const id = Argument.String('id').pipe(Argument.withDescription('The ID to check'), Argument.optional)
const type = Flag.Literals('type', ['uuid', 'ulid'] as const).pipe(Flag.optional)
const count = Flag.Int('count').pipe(Flag.withAlias('n'), Flag.withDefault(1))
const version = Flag.ChoiceWithValue('uuid-version', [
  ['4', 4],
  ['7', 7],
] as const).pipe(Flag.withAlias('v'), Flag.withDefault(4 as 4 | 7))

export const check = Command.make('check', { id, type, count, version }, ({ id, type, count, version }) =>
  Effect.log(Option.getOrUndefined(id), Option.getOrUndefined(type), count, version),
)
```

`--node` and `--node-bits` on `tsid` stay `Flag.String` on purpose: the handler parses
them so invalid values fail with the CLI's coded errors (`INVALID_NODE`,
`INVALID_NODE_BITS`) and `--json` error output, like `--timestamp`.

## Built-in global flags

Effect 4.1 enables `--help`/`-h`, `--version`/`-v`, `--wizard`, `--completions`, and
`--log-level` by default. uniku leaves the interactive `--wizard` out, from
`packages/cli/src/cli-config.ts`:

```ts no-check
export const UnikuCliConfig: CliConfig.CliConfig.Service = CliConfig.make({
  builtIns: [GlobalFlag.Help, GlobalFlag.Version, GlobalFlag.Completions, GlobalFlag.LogLevel],
})
```

`makeCliRunner` provides it, so the entrypoint and the tests see the same flags. A
subcommand-local flag with the same alias as a built-in wins at its own level
(`uniku uuid -v 7`). `src/runtime/args.ts` rewrites `-V` to `--version` before parsing.

## Invocation and output

`Command.runWith(rootCmd, { version })` takes the user-facing args, without the
executable and script path. Since 4.1 it:

- forwards operands after `--` to the selected subcommand, so `uniku inspect -- --tricky-id`
  inspects `--tricky-id` with no preprocessing;
- wraps every parse failure, including a bad global flag value (`--log-level bogus`), in
  `CliError.ShowHelp` and renders help plus the errors itself before failing with it;
- renders a handler failure that carries a `CliError.userMessage` (such as
  `CliError.UserError`) before failing with it.

The entrypoint must not render those again. `handleCliFailure` in
`src/runtime/cli-failure.ts` writes only uniku's own failures (`CliError`,
`ValidationFailedError`, as text or `--json`), prints any other framework error a handler
raised, and sets the exit code through `exitCodeFor`: `ShowHelp` exits 0 without errors
(explicit help, or a group run without a subcommand) and 1 with errors,
`ValidationFailedError` exits 2, everything else 1. Both functions match with
`Match.exhaustive`, so a new framework error tag in a future release is a compile error.

## Verification

Command tests drive the real runner through `cli([...])` in
`packages/cli/__tests__/__utils__/cli.ts`, which applies the same argument preprocessing
as `src/bin.ts`. After a change to parsing, help, or errors, also run the built bin:
`node packages/cli/build/bin.mjs <args>; echo $?`.
