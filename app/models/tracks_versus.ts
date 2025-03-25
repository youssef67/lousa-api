import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { VersusTracksSession } from '#interfaces/playlist_interface'
// import PlaylistPendingTrack from './playlist_pending_track.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Track from './track.js'

export default class TracksVersus extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare playlistId: string

  @column()
  declare firstTrackId: string

  @column()
  declare secondTrackId: string

  @column()
  declare firstTrackVotes: number

  @belongsTo(() => Track, {
    foreignKey: 'firstTrackId',
  })
  declare firstTrack: BelongsTo<typeof Track>

  @belongsTo(() => Track, {
    foreignKey: 'secondTrackId',
  })
  declare secondTrack: BelongsTo<typeof Track>

  @column()
  declare secondTrackVotes: number

  @column()
  declare closingDate: DateTime

  @column()
  declare winner: string | null

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
      firstTrackVotes: this.firstTrackVotes,
      secondTrackVotes: this.secondTrackVotes,
      firstTrack: this.firstTrack.serializeTrack(),
      secondTrack: this.secondTrack.serializeTrack(),
    } as VersusTracksSession
    return result
  }
}
