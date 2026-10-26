import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const gameRooms=sqliteTable('game_rooms',{
 id:text('id').primaryKey(),code:text('code').notNull().unique(),createRequestId:text('create_request_id').notNull().unique(),version:integer('version').notNull().default(0),stateJson:text('state_json').notNull(),createdAtMs:integer('created_at_ms').notNull(),expiresAtMs:integer('expires_at_ms').notNull(),
});
export const requestLimits=sqliteTable('request_limits',{key:text('key').primaryKey(),windowStartMs:integer('window_start_ms').notNull(),hits:integer('hits').notNull()});
