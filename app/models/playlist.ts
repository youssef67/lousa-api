import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { PlaylistSession } from '#interfaces/spotify_interface'
import { ModelStatus } from '#types/model_status'

export default class Playlist extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare spotifyPlaylistId: string

  @column()
  declare playlistName: string

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

  serializePlaylist(): PlaylistSession {
    const result = {
      id: this.id,
      playlistName: this.playlistName,
    } as PlaylistSession
    return result
  }
}
