import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'playlist_pending_tracks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').nullable().references('id').inTable('users')
      table.uuid('playlist_id').nullable().references('id').inTable('playlists').onDelete('CASCADE')
      table.uuid('track_id').nullable().references('id').inTable('tracks').onDelete('CASCADE')
      table.integer('vote').defaultTo(0)
      table.integer('position').defaultTo(0)
      table.string('status').notNullable().defaultTo('on_hold')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
