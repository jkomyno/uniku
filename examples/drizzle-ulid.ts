import { expect, test } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { customType, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { ulid } from 'uniku/ulid'

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
})

const events = pgTable('events', {
  id: bytea()
    .primaryKey()
    .$defaultFn(() => ulid.toBytes(ulid())),
  name: text().notNull(),
})

test('generates and stores a binary ULID with Drizzle', async () => {
  const client = new PGlite()
  const db = drizzle({ client })

  try {
    await db.execute(sql`
      create table events (
        id bytea primary key,
        name text not null
      )
    `)

    const [event] = await db.insert(events).values({ name: 'account.created' }).returning()

    if (!event) throw new Error('The inserted event was not returned')

    const restoredId = ulid.fromBytes(event.id)

    expect(event.id).toBeInstanceOf(Uint8Array)
    expect(event.id).toHaveLength(16)
    expect(ulid.isValid(restoredId)).toBe(true)
    expect(event.name).toBe('account.created')
  } finally {
    await client.close()
  }
})
