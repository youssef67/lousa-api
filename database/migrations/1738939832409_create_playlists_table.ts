import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'playlists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table
        .uuid('space_streamer_id')
        .notNullable()
        .references('id')
        .inTable('space_streamers')
        .onDelete('CASCADE')
      table.string('spotify_playlist_id').nullable()
      table.string('spotify_snap_shot_id').nullable()
      table.string('playlist_name').nullable()
      table.string('status').notNullable().defaultTo('enabled')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
