import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'space_streamers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table
        .uuid('twitch_user_id')
        .nullable()
        .references('id')
        .inTable('twitch_users')
        .onDelete('CASCADE')
      table.string('name_space').nullable()
      table.integer('nb_viewer').notNullable().defaultTo(0)
      table.string('twitch_id').nullable()
      table.string('twitch_user_login').nullable()
      table.string('space_streamer_img').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
