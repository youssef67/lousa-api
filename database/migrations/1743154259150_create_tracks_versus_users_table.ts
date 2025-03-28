import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tracks_versus_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.uuid('user_id').references('users.id').onDelete('CASCADE')
      table.uuid('tracks_versus_id').references('tracks_versuses.id').onDelete('CASCADE')
      table.unique(['user_id', 'tracks_versus_id'])
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.index(['user_id', 'tracks_versus_id'], 'tracks_versus_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
