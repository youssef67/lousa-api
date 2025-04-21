import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { VersusTracksSession } from '#interfaces/playlist_interface'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Track from './track.js'
import { TracksVersusStatus } from '#types/versus.status'
import LikeTrack from './like_track.js'

export default class TracksVersus extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare playlistId: string

  @column()
  declare firstTrackId: string | null

  @column()
  declare secondTrackId: string | null

  @column()
  declare firstTrackUser: string | null

  @column()
  declare secondTrackUser: string | null

  @column()
  declare firstTrackScore: number

  @column()
  declare secondTrackScore: number

  @column()
  declare specialLikeFirstTrack: number

  @column()
  declare specialLikeSecondTrack: number

  @column()
  declare closingDate: DateTime | null

  @column()
  declare trackWinner: string | null

  @column()
  declare userWinner: string | null

  @column()
  declare goldenLike: string | null

  @column()
  declare status: TracksVersusStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => LikeTrack)
  declare likeTracks: HasMany<typeof LikeTrack>

  @belongsTo(() => Track, {
    foreignKey: 'firstTrackId',
  })
  declare firstTrack: BelongsTo<typeof Track>

  @belongsTo(() => Track, {
    foreignKey: 'secondTrackId',
  })
  declare secondTrack: BelongsTo<typeof Track>

  async loadForSerialization() {
    // we use this hack to allows to call user.load('XXXX')
    // Otherwise this is not working
    // cf: https://github.com/orgs/adonisjs/discussions/1872#discussioncomment-404025
    const tracksVersus: TracksVersus = this
    await tracksVersus.load('firstTrack')
    await tracksVersus.load('secondTrack')
  }

  serializeVersusTrack(): VersusTracksSession {
    const result = {
      id: this.id,
      firstTrackScore: this.firstTrackScore,
      secondTrackScore: this.secondTrackScore,
      firstTrack: this.firstTrack.serializeTrack(),
      secondTrack: this.secondTrack.serializeTrack(),
    } as VersusTracksSession
    return result
  }
}
