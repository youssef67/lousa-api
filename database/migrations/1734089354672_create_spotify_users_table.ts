import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spotify_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('spotify_id').notNullable().unique()
      table.string('display_name').notNullable().unique()
      table.string('email_spotify').notNullable().unique()
      table.string('external_url').notNullable().unique()
      table.integer('nb_followers').notNullable()
      table.text('access_token').notNullable()
      table.string('refresh_token').notNullable()
      table.timestamp('token_expires_at').notNullable()
      table.text('scope').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
