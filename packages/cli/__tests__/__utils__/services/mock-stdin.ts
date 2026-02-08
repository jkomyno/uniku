import * as Effect from 'effect/Effect'
import type { CliError } from '@/src/domain/errors'
import { StdinService } from '@/src/services/StdinService'

/**
 * Create a mock StdinService that returns the given lines.
 */
export const fromLines = (lines: readonly string[]): StdinService['Type'] =>
  StdinService.of({
    readLines: () => Effect.succeed(lines) as Effect.Effect<readonly string[], CliError>,
  })
