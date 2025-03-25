import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PlaylistTrack from './playlist_track.js'
import { TrackSerialized } from '#interfaces/playlist_interface'

export default class Track extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare spotifyTrackId: string

  @column()
  declare trackName: string

  @column()
  declare artistName: string

  @column()
  declare album: string

  @column()
  declare cover: string

  @column()
  declare url: string

  @column()
  declare duration: number

  @hasMany(() => PlaylistTrack)
  declare playlistTracks: HasMany<typeof PlaylistTrack>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeTrack(): TrackSerialized {
    const result = {
      trackId: this.id,
      spotifyTrackId: this.spotifyTrackId,
      trackName: this.trackName,
      artistName: this.artistName,
      album: this.album,
      cover: this.cover,
      url: this.url,
    } as TrackSerialized
    return result
  }
}
