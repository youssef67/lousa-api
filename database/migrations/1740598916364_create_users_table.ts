import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('date_of_birth')
      table.string('user_name').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
