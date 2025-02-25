import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Playlist from './playlist.js'
import PlaylistTrack from './playlist_track.js'
import { TrackSession } from '#interfaces/viewer_interface'

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

  @column()
  declare submittedBy: string

  @hasMany(() => PlaylistTrack)
  declare playlistTracks: HasMany<typeof PlaylistTrack>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeTrack(): TrackSession {
    const result = {
      spotifyTrackId: this.spotifyTrackId,
      trackName: this.trackName,
      artistName: this.artistName,
      album: this.album,
      cover: this.cover,
      url: this.url,
    } as TrackSession
    return result
  }
}
