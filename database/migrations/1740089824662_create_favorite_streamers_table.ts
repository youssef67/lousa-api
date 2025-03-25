import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'favorite_streamers_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').unsigned().references('users.id').onDelete('CASCADE')
      table
        .uuid('space_streamer_id')
        .unsigned()
        .references('space_streamers.id')
        .onDelete('CASCADE')
      table.unique(['user_id', 'space_streamer_id'])
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.index(['user_id', 'space_streamer_id'], 'favorite_streamers_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
