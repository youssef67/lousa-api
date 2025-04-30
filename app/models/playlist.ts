import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { PlaylistSession } from '#interfaces/spotify_interface'
import { ModelStatus } from '#types/model_status'
import SpaceStreamer from './space_streamer.js'
import PlaylistTrack from './playlist_track.js'
import TracksVersus from './tracks_versus.js'

export default class Playlist extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare spotifyPlaylistId: string

  @column()
  declare spotifySnapShotId: string

  @column()
  declare playlistName: string

  @column()
  declare status: ModelStatus

  @column()
  declare onlyFollowers: boolean

  @column()
  declare maxRankedTracks: number

  @column()
  declare spaceStreamerId: string

  @belongsTo(() => SpaceStreamer, {
    foreignKey: 'spaceStreamerId',
  })
  declare spaceStreamer: BelongsTo<typeof SpaceStreamer>

  @hasOne(() => TracksVersus)
  declare tracksVersus: HasOne<typeof TracksVersus>

  @hasMany(() => PlaylistTrack)
  declare playlistTracks: HasMany<typeof PlaylistTrack>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializePlaylist(): PlaylistSession {
    const result = {
      id: this.id,
      playlistName: this.playlistName,
      onlyFollowers: this.onlyFollowers,
      maxRankedTracks: this.maxRankedTracks,
    } as PlaylistSession
    return result
  }
}
