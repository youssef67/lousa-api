import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracks_versuses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('playlist_id').nullable().references('id').inTable('playlists').onDelete('CASCADE')
      table.uuid('first_track_id').nullable().references('id').inTable('tracks').onDelete('CASCADE')
      table
        .uuid('second_track_id')
        .nullable()
        .references('id')
        .inTable('tracks')
        .onDelete('CASCADE')
      table.integer('first_track_score').notNullable().defaultTo(0)
      table.integer('second_track_score').notNullable().defaultTo(0)
      table.uuid('first_track_user').nullable()
      table.uuid('second_track_user').nullable()
      table.timestamp('closing_date')
      table.uuid('track_winner').nullable()
      table.uuid('user_winner').nullable()
      table.string('status').notNullable().defaultTo('on_hold')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
