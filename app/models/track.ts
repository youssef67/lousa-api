import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PlaylistTrack from './playlist_track.js'
import { DataTrack } from '#interfaces/playlist_interface'
import LikeTrack from './like_track.js'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => PlaylistTrack)
  declare playlistTracks: HasMany<typeof PlaylistTrack>

  @hasMany(() => LikeTrack)
  declare likeTracks: HasMany<typeof LikeTrack>

  serializeTrack(): DataTrack {
    const result = {
      trackId: this.id,
      spotifyTrackId: this.spotifyTrackId,
      trackName: this.trackName,
      artistName: this.artistName,
      album: this.album,
      cover: this.cover,
      url: this.url,
    } as DataTrack
    return result
  }
}
