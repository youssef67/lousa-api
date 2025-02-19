import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'twitch_streams'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('twitch_id').nullable()
      table.string('user_login').nullable()
      table.string('user_name').nullable()
      table.string('thumbnail_url').nullable()
      table.timestamp('date_activation').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
