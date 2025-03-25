import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { TrackStatus } from '#types/track_status'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Track from './track.js'
import { PendingTrackSerialized, UserFromTrack } from '#interfaces/playlist_interface'

export default class PlaylistPendingTrack extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare playlistId: string

  @column()
  declare trackId: string

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Track, {
    foreignKey: 'trackId',
  })
  declare track: BelongsTo<typeof Track>

  @column()
  declare status: TrackStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializePlaylistTrack(): PendingTrackSerialized {
    const result = {
      pendingTrackId: this.id,
      trackId: this.trackId,
      user: this.user.serializeAsSession() || undefined,
    } as PendingTrackSerialized
    return result
  }

  getUser(): UserFromTrack {
    const result = {
      user: this.user.getUserNameAndId() || undefined,
    } as UserFromTrack
    return result
  }
}
