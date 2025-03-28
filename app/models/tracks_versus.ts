import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { VersusTracksSession } from '#interfaces/playlist_interface'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Track from './track.js'
import { VersusStatus } from '#types/versus.status'

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

  @belongsTo(() => Track, {
    foreignKey: 'firstTrackId',
  })
  declare firstTrack: BelongsTo<typeof Track>

  @belongsTo(() => Track, {
    foreignKey: 'secondTrackId',
  })
  declare secondTrack: BelongsTo<typeof Track>

  @column()
  declare firstTrackScore: number

  @column()
  declare secondTrackScore: number

  @column()
  declare closingDate: DateTime

  @column()
  declare trackWinner: string | null

  @column()
  declare UserWinner: string | null

  @column()
  declare status: VersusStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

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
