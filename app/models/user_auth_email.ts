import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { ModelStatus } from '#types/model_status'
import { UserAuthEmailState } from '#types/user_auth_email_state'

export default class UserAuthEmail extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare deviceId: string

  @column()
  declare email: string

  @column()
  declare date: string

  @column()
  declare attempt: number

  @column()
  declare failure: string

  @column()
  declare state: UserAuthEmailState

  @column()
  declare code1: string

  @column()
  declare locale: string

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
  declare type: string

  @column()
  declare status: ModelStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare tVersion: number

  isCreatedAtLessThan30seconds(): boolean {
    const now = DateTime.now()
    const diff = now.diff(this.createdAt, 'seconds').seconds

    return diff < 30
  }

  isCreatedAtMoreThan5Minutes(): boolean {
    const now = DateTime.now()
    const diff = now.diff(this.createdAt, 'minutes').minutes
    return diff > 5
  }
}
