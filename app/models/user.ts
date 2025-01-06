import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, hasMany } from '@adonisjs/lucid/orm'
import type { HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import { UserRole } from '#types/user_role'
import { ModelStatus } from '#types/model_status'
import { UserSession } from '#interfaces/common_interface'
import SpotifyUser from './spotify_user.js'
import Playlist from './playlist.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare email: string

  @column()
  declare firstName?: string

  @column()
  declare lastName?: string

  @column.dateTime()
  declare dateOfBirth?: DateTime | null

  @column()
  declare role: UserRole

  @column()
  declare status: ModelStatus

  @column()
  declare spotifyUserId?: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => SpotifyUser, {
    foreignKey: 'spotifyUserId',
  })
  declare spotifyUser: HasOne<typeof SpotifyUser>

  @hasMany(() => Playlist, {
    foreignKey: 'userId',
  })
  declare playlists: HasMany<typeof Playlist>

  serializeAsSession(): UserSession {
    const result = {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      dateOfBirth: this.dateOfBirth,
      role: this.role,
    } as UserSession
    return result
  }
}
