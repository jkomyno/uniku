import { Command } from 'effect/cli'
import { generateCmd$Cuid } from './cuid/generate.cuid.cmd'
import { generateCmd$Ksuid } from './ksuid/generate.ksuid.cmd'
import { generateCmd$Nanoid } from './nanoid/generate.nanoid.cmd'
import { generateCmd$Objectid } from './objectid/generate.objectid.cmd'
import { generateCmd$Tsid } from './tsid/generate.tsid.cmd'
import { generateCmd$Typeid } from './typeid/generate.typeid.cmd'
import { generateCmd$Ulid } from './ulid/generate.ulid.cmd'
import { generateCmd$Uuid } from './uuid/generate.uuid.cmd'
import { generateCmd$Xid } from './xid/generate.xid.cmd'

export const generateSubcommands = [
  generateCmd$Uuid,
  generateCmd$Ulid,
  generateCmd$Typeid,
  generateCmd$Nanoid,
  generateCmd$Cuid,
  generateCmd$Ksuid,
  generateCmd$Objectid,
  generateCmd$Xid,
  generateCmd$Tsid,
] as const

export const generateCmd = Command.make('generate').pipe(
  Command.withDescription('Generate new IDs'),
  Command.withSubcommands(generateSubcommands),
  Command.withExamples([
    { command: 'uniku generate uuid -n 5 --json', description: 'Generate 5 UUIDs as a JSON array' },
    { command: 'uniku generate typeid --prefix user', description: 'Generate one user TypeID' },
    {
      command: 'uniku generate ulid',
      description: 'Generate one ULID (subcommands also work top-level: `uniku ulid`)',
    },
  ]),
)
