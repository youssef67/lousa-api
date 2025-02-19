import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { StreamerSerialized } from '#interfaces/twitch_interface'

export default class TwitchStream extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare twitchId: string

  @column()
  declare userLogin: string

  @column()
  declare userName: string

  @column()
  declare thumbnailUrl: string

  @column.dateTime()
  declare dateActivation: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  streamerSerialize(): StreamerSerialized {
    const result = {
      id: this.id,
      userLogin: this.userLogin,
      userName: this.userName,
      thumbnailUrl: this.thumbnailUrl,
    } as StreamerSerialized
    return result
  }
}
