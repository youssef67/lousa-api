import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'twitch_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('twitch_id').nullable().unique()
      table.string('display_name').nullable().unique()
      table.string('email_twitch').nullable().unique()
      table.string('avatar_url').nullable().unique()
      table.integer('view_count').nullable()
      table.string('state').nullable()
      table.string('status').notNullable().defaultTo('enabled')
      table.text('access_token').nullable()
      table.string('refresh_token').nullable()
      table.uuid('space_streamer_id').nullable()
      table.timestamp('token_expires_at').nullable()
      table.boolean('is_streamer').nullable().defaultTo(false)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
