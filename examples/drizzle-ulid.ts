import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { bytea, pgTable, text } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/pglite'
import { ulid } from 'uniku/ulid'

const events = pgTable('events', {
  id: bytea().primaryKey(),
  name: text().notNull(),
})

const client = new PGlite()
const db = drizzle({ client })

try {
  await db.execute(sql`
    create table events (
      id bytea primary key,
      name text not null
    )
  `)

  const id = ulid()
  const [event] = await db
    .insert(events)
    .values({
      id: Buffer.from(ulid.toBytes(id)),
      name: 'account.created',
    })
    .returning()

  if (!event) throw new Error('The inserted event was not returned')

  const restoredId = ulid.fromBytes(event.id)

  assert.equal(restoredId, id)
  assert.equal(event.name, 'account.created')

  console.log({
    id: restoredId,
    name: event.name,
  })
} finally {
  await client.close()
}
