import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import { StreamerSpaceSession } from '#interfaces/common_interface'
import Playlist from './playlist.js'
import TwitchUser from './twitch_user.js'
import SpotifyUser from './spotify_user.js'

export default class SpaceStreamer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nameSpace: string

  @column()
  declare nbViewer: number

  @column()
  declare twitchUserId: string

  @column()
  declare spotifyUserId: string

  @column()
  declare twitchId: string

  @column()
  declare twitchUserLogin: string

  @column()
  declare spaceStreamerImg: string

  @column()
  declare lastPlaylistIdSelected: string

  @belongsTo(() => TwitchUser, {
    foreignKey: 'twitchUserId',
  })
  declare twitchUser: BelongsTo<typeof TwitchUser>

  @belongsTo(() => SpotifyUser, {
    foreignKey: 'spotifyUserId',
  })
  declare spotifyUser: BelongsTo<typeof SpotifyUser>

  @hasMany(() => Playlist)
  declare playlists: HasMany<typeof Playlist>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeAsSession(): StreamerSpaceSession {
    const result = {
      id: this.id,
      spaceName: this.nameSpace,
      twitchUserId: this.twitchUserId,
      twitchUserLogin: this.twitchUserLogin,
      spaceStreamerImg: this.spaceStreamerImg,
      lastPlaylistIdSelected: this.lastPlaylistIdSelected,
    } as StreamerSpaceSession
    return result
  }
}
