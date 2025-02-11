import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import TwitchUser from './twitch_user.js'

export default class SpaceStreamer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare TwitchUserId: string

  @column()
  declare nameSpace: string

  @column()
  declare nbViewer: number

  @belongsTo(() => TwitchUser, {
    foreignKey: 'TwitchUserId',
  })
  declare twitchUser: BelongsTo<typeof TwitchUser>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
