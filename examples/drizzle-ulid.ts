import { expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { eq, sql } from 'drizzle-orm'
import { customType, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { ulid } from 'uniku/ulid'

const binaryUlid = customType<{ data: string; driverData: Uint8Array }>({
  dataType: () => 'bytea',
  codec: 'bytea',
})

const events = pgTable('events', {
  id: binaryUlid()
    .primaryKey()
    .$defaultFn(() => ulid()),
  name: text().notNull(),
})

const eventDeliveries = pgTable('event_deliveries', {
  eventId: binaryUlid('event_id')
    .notNull()
    .references(() => events.id),
  target: text().notNull(),
})

test('generates and stores a binary ULID with Drizzle', async () => {
  const client = new PGlite()
  const db = drizzle({
    client,
    codecs: {
      bytea: {
        normalize: (value: Uint8Array) => ulid.fromBytes(value),
        normalizeInJson: (value: string) => ulid.fromBytes(Uint8Array.fromBase64(value)),
        normalizeParam: (value: string) => ulid.toBytes(value),
      },
    },
  })

  try {
    await db.execute(sql`
      create table events (
        id bytea primary key,
        name text not null
      )
    `)
    await db.execute(sql`
      create table event_deliveries (
        event_id bytea not null references events(id),
        target text not null
      )
    `)

    const [event] = await db.insert(events).values({ name: 'account.created' }).returning()

    if (!event) throw new Error('The inserted event was not returned')

    await db.insert(eventDeliveries).values({ eventId: event.id, target: 'analytics' })

    const [delivery] = await db
      .select({
        eventId: events.id,
        storedBytes: sql<number>`octet_length(${events.id})`,
        target: eventDeliveries.target,
      })
      .from(events)
      .innerJoin(eventDeliveries, eq(events.id, eventDeliveries.eventId))

    if (!delivery) throw new Error('The joined delivery was not returned')

    // Example: delivery.eventId = '01KXJP51P435NADKZ683PNVK1R'

    console.log('delivery.eventId:', delivery.eventId)

    expect(delivery.eventId).toBe(event.id)
    expect(typeof delivery.eventId).toBe('string')
    expect(ulid.isValid(delivery.eventId)).toBe(true)
    expect(delivery.storedBytes).toBe(16)
    expect(delivery.target).toBe('analytics')
    expect(event.name).toBe('account.created')
  } finally {
    await client.close()
  }
})
