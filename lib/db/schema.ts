// lib/db/schema.ts
import {
  pgTable, text, timestamp, boolean, integer, uuid
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'   // import Better Auth's user table for FK references

export const rooms = pgTable('rooms', {
  id:              uuid('id').primaryKey().defaultRandom(),
  code:            text('code').unique().notNull(),        // shareable join code
  name:            text('name'),
  // creator identity — one of these will always be set, the other null
  creatorUserId:   text('creator_user_id').references(() => user.id, { onDelete: 'set null' }),
  creatorGuestId:  text('creator_guest_id'),
  chatExpiryDays:  integer('chat_expiry_days').notNull().default(7),
  isActive:        boolean('is_active').notNull().default(true),
  endedAt:         timestamp('ended_at'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})

export const roomParticipants = pgTable('room_participants', {
  id:          uuid('id').primaryKey().defaultRandom(),
  roomId:      uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }).notNull(),
  userId:      text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  guestId:     text('guest_id'),           // for guests
  displayName: text('display_name').notNull(),
  joinedAt:    timestamp('joined_at').defaultNow().notNull(),
  leftAt:      timestamp('left_at'),       // null = currently in room
})