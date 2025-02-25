import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.string('spotify_track_id').notNullable()
      table.string('track_name').notNullable()
      table.string('artist_name').notNullable()
      table.string('album').notNullable()
      table.string('cover').notNullable()
      table.string('url').notNullable()
      table.integer('duration').nullable()
      table.uuid('submitted_by').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
