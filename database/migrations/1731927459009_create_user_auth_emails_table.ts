import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_auth_emails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.uuid('device_id').references('id')
      table.string('email').notNullable()
      table.string('date').notNullable()
      table.integer('attempt').notNullable().defaultTo(0)
      table.string('state').notNullable().comment('open|success|failure|cancelled')
      table.text('failure').notNullable().defaultTo('').comment('failureCode1,failureCode2,…')
      table.string('code_1').notNullable()
      table.string('locale').notNullable()
      table.string('timezone').notNullable()
      table.string('model').notNullable()
      table.string('os').notNullable()
      table.string('os_version').notNullable()
      table.string('app_version').notNullable()
      table.string('last_ip').notNullable()
      table.string('type').notNullable().comment('login|signup')
      table.string('status').notNullable().defaultTo('enabled')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.integer('t_version').notNullable().defaultTo(1)
      table.index(['user_id'], 'auth_emails_user_id_index')
      table.index(['email'], 'auth_emails_email_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
