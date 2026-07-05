import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Ref from 'effect/Ref'
import { UpdateCheckService, type UpdateInfo } from '@/src/services/UpdateCheckService'

// =============================================================================
// Models
// =============================================================================

export interface MockUpdateCheckAccess {
  /** Get all notifications that were printed. */
  readonly getNotifications: () => Effect.Effect<ReadonlyArray<UpdateInfo>>
  /** Reset captured state. */
  readonly reset: () => Effect.Effect<void>
}

// =============================================================================
// Context Tag
// =============================================================================

export class MockUpdateCheckTag extends Context.Service<MockUpdateCheckTag, MockUpdateCheckAccess>()(
  'test/MockUpdateCheck',
) {}

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create a mock UpdateCheckService that always returns None (no update available).
 * This is the default for tests — the update check is a no-op.
 */
export const make = Effect.gen(function* () {
  const notificationsRef = yield* Ref.make<ReadonlyArray<UpdateInfo>>([])

  const service = UpdateCheckService.of({
    check(_currentVersion) {
      return Effect.succeed(Option.none())
    },
    notify(info) {
      return Ref.update(notificationsRef, (ns) => [...ns, info])
    },
  })

  const access: MockUpdateCheckAccess = {
    getNotifications: () => Ref.get(notificationsRef),
    reset: () => Ref.set(notificationsRef, []),
  }

  return { service, access }
})

// =============================================================================
// Accessors
// =============================================================================

export const getNotifications = MockUpdateCheckTag.use((mock) => mock.getNotifications())
export const reset = MockUpdateCheckTag.use((mock) => mock.reset())
