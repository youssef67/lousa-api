import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('locale').notNullable()
      table.string('language').notNullable()
      table.string('timezone').notNullable()
      table.string('model').notNullable()
      table.string('os').notNullable()
      table.string('os_version').notNullable()
      table.string('app_version').notNullable()
      table.string('last_ip').notNullable()
      table.string('push_token').nullable()
      table.string('access_token').notNullable()
      table.string('refresh_token').notNullable()
      table.timestamp('last_connection_at').notNullable()
      table.string('status').notNullable().defaultTo('enabled')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
