import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasOne, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { UserRole } from '#types/user_role'
import { ModelStatus } from '#types/model_status'
import { UserSession, UserNameAndId } from '#interfaces/common_interface'
import SpotifyUser from './spotify_user.js'
import Playlist from './playlist.js'
import TwitchUser from './twitch_user.js'
import SpaceStreamer from './space_streamer.js'
import PlaylistTrack from './playlist_track.js'
import TracksVersus from './tracks_versus.js'
import LikeTrack from './like_track.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare email: string

  @column()
  declare firstName?: string

  @column()
  declare lastName?: string

  @column()
  declare userName?: string

  @column()
  declare amountVirtualCurrency: number

  @column()
  declare role: UserRole

  @column()
  declare status: ModelStatus

  @column()
  declare spotifyUserId?: string

  @column()
  declare twitchUserId?: string

  @column()
  declare playlistSelected: string | null

  @column()
  declare victoryPoints: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => SpotifyUser, {
    foreignKey: 'userId',
  })
  declare spotifyUser: HasOne<typeof SpotifyUser>

  @hasOne(() => TwitchUser, {
    foreignKey: 'userId',
  })
  declare twitchUser: HasOne<typeof TwitchUser>

  @hasMany(() => PlaylistTrack)
  declare playlistTracks: HasMany<typeof PlaylistTrack>

  @hasMany(() => LikeTrack)
  declare likeTracks: HasMany<typeof LikeTrack>

  @manyToMany(() => TracksVersus, {
    pivotTable: 'tracks_versus_users',
  })
  declare versusTracks: ManyToMany<typeof TracksVersus>

  @manyToMany(() => Playlist, {
    pivotTable: 'favorite_playlists_users',
  })
  declare favoritesPlaylists: ManyToMany<typeof Playlist>

  @manyToMany(() => SpaceStreamer, {
    pivotTable: 'favorite_streamers_users',
  })
  declare favoritesSpaceStreamers: ManyToMany<typeof SpaceStreamer>

  async loadForSerializationAsSession() {
    // we use this hack to allows to call user.load('XXXX')
    // Otherwise this is not working
    // cf: https://github.com/orgs/adonisjs/discussions/1872#discussioncomment-404025
    const user: User = this

    if (this.twitchUserId) {
      await user.load('twitchUser')
    }

    if (this.spotifyUserId) {
      await user.load('spotifyUser')
    }
  }

  serializeAsSession(): UserSession {
    const result = {
      id: this.id,
      userName: this.userName,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      role: this.role,
      amountVirtualCurrency: this.amountVirtualCurrency,
      victoryPoints: this.victoryPoints,
      twitchUser: this.twitchUser?.serializeAsSession() || undefined,
      spotifyUser: this.spotifyUser?.serializeAsSession() || undefined,
    } as UserSession
    return result
  }

  getUserNameAndId(): UserNameAndId {
    const result = {
      id: this.id,
      userName: this.userName,
    } as UserNameAndId
    return result
  }
}
