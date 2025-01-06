import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { ModelStatus } from '#types/model_status'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Device extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare locale: string

  @column()
  declare language: string

  @column()
  declare timezone: string

  @column()
  declare model: string

  @column()
  declare os: string

  @column()
  declare osVersion: string

  @column()
  declare appVersion: string

  @column()
  declare lastIp: string

  @column()
  declare pushToken?: string

  @column()
  declare accessToken: string

  @column()
  declare refreshToken: string

  @column.dateTime()
  declare lastConnectionAt: DateTime

  @column()
  declare status: ModelStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>
}
