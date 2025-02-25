import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { TrackStatus } from '#types/track_status'
import { PlaylistTrackSession } from '#interfaces/viewer_interface'

export default class PlaylistTrack extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare playlistId: string

  @column()
  declare trackId: string

  @column()
  declare vote: number

  @column()
  declare position: number

  @column()
  declare status: TrackStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializePlaylistTrack(): PlaylistTrackSession {
    const result = {
      id: this.id,
      trackId: this.trackId,
      vote: this.vote,
      position: this.position,
    } as PlaylistTrackSession
    return result
  }
}
