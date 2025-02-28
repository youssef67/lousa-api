import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { TrackStatus } from '#types/track_status'
import { PlaylistTrackSession } from '#interfaces/viewer_interface'
import User from './user.js'

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
  declare vote: number

  @column()
  declare position: number

  @column()
  declare status: TrackStatus

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

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

  serializePlaylistTrack(): PlaylistTrackSession {
    const result = {
      id: this.id,
      trackId: this.trackId,
      vote: this.vote,
      position: this.position,
      user: this.user.serializeAsSession() || undefined,
    } as PlaylistTrackSession
    return result
  }
}
