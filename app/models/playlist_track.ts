import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { TrackStatus } from '#types/track_status'
import { PlaylistTrackSerialized } from '#interfaces/playlist_interface'
import User from './user.js'
import Track from './track.js'

export default class PlaylistTrack extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare playlistId: string

  @column()
  declare trackId: string

  @column()
  declare score: number

  @column()
  declare specialScore: number

  @column()
  declare vote: number

  @column()
  declare isRanked: boolean

  @column()
  declare position: number | null

  @column()
  declare status: TrackStatus

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Track, {
    foreignKey: 'trackId',
  })
  declare track: BelongsTo<typeof Track>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async loadForSerialization() {
    // we use this hack to allows to call user.load('XXXX')
    // Otherwise this is not working
    // cf: https://github.com/orgs/adonisjs/discussions/1872#discussioncomment-404025
    const playlistTrack: PlaylistTrack = this
    await playlistTrack.load('user')
  }

  serializePlaylistTrack(): PlaylistTrackSerialized {
    const result = {
      id: this.id,
      trackId: this.trackId,
      vote: this.vote,
      position: this.position,
      score: this.score,
      specialScore: this.specialScore,
      user: this.user ? this.user.serializeAsSession() : null,
    } as PlaylistTrackSerialized
    return result
  }
}
