import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spotify_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      // TODO : remettre en unique()
      table.string('spotify_id').notNullable()
      table.text('access_token').nullable()
      table.string('refresh_token').nullable()
      table.timestamp('token_expires_at').nullable()
      table.uuid('space_streamer_id').nullable()
      table.text('scope').nullable()
      table.string('status').notNullable().defaultTo('enabled')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
