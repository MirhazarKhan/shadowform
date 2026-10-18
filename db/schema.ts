import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('spirit_rooms', {
  code: text('code').primaryKey(),
  hostId: text('host_id').notNull(),
  epoch: integer('epoch').notNull().default(1),
  phase: text('phase').notNull().default('lobby'),
  world: text('world').notNull().default('{}'),
  revision: integer('revision').notNull().default(0),
  created: integer('created').notNull(),
  expires: integer('expires').notNull(),
});

export const players = sqliteTable('spirit_players', {
  id: text('id').primaryKey(),
  room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  slot: integer('slot').notNull(),
  name: text('name').notNull(),
  ready: integer('ready').notNull().default(0),
  available: integer('available').notNull().default(1),
  joined: integer('joined').notNull(),
  seen: integer('seen').notNull(),
  state: text('state').notNull().default('{}'),
}, (t) => [uniqueIndex('spirit_player_slot').on(t.room, t.slot)]);

export const events = sqliteTable('spirit_events', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  eventId: text('event_id').notNull(),
  room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  actor: text('actor').notNull(),
  payload: text('payload').notNull(),
  created: integer('created').notNull(),
}, (t) => [uniqueIndex('spirit_event_once').on(t.room, t.actor, t.eventId), index('spirit_event_room_seq').on(t.room, t.seq)]);

export const signals = sqliteTable('spirit_signals', {
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  signalId: text('signal_id').notNull(),
  room: text('room').notNull().references(() => rooms.code, { onDelete: 'cascade' }),
  sender: text('sender').notNull(),
  recipient: text('recipient').notNull(),
  payload: text('payload').notNull(),
  created: integer('created').notNull(),
}, (t) => [uniqueIndex('spirit_signal_once').on(t.sender, t.signalId), index('spirit_signal_recipient_seq').on(t.room, t.recipient, t.seq)]);
