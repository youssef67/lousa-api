import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'favorite_playlists_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').references('users.id').onDelete('CASCADE')
      table.uuid('playlist_id').references('playlists.id').onDelete('CASCADE')
      table.unique(['user_id', 'playlist_id'])
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.index(['user_id', 'playlist_id'], 'favorite_playlists_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
