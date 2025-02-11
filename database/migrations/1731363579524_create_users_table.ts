import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.string('email').notNullable().unique()
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.timestamp('date_of_birth').nullable()
      table.string('role').notNullable()
      table.string('status').notNullable().defaultTo('enabled')
      table.uuid('spotify_user_id').nullable()
      table.uuid('twitch_user_id').nullable()
      table.uuid('playlist_selected').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
