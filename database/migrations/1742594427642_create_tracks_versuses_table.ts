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
      table.integer('first_track_votes').notNullable().defaultTo(0)
      table.integer('second_track_votes').notNullable().defaultTo(0)
      table.timestamp('closing_date')
      table.uuid('winner').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
