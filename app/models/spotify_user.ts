import { DateTime } from 'luxon'
import axios from 'axios'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import ApiError from '#types/api_error'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { RefreshTokenResponse } from '#interfaces/spotify_interface'
import env from '#start/env'
import { SpotifyUserSession } from '#interfaces/common_interface'
import SpaceStreamer from './space_streamer.js'
import { ModelStatus } from '#types/model_status'

export default class SpotifyUser extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare spotifyId: string

  @column()
  declare accessToken: string

  @column()
  declare refreshToken: string

  @column()
  declare tokenExpiresAt: DateTime

  @column()
  declare scope: string

  @column()
  declare status: ModelStatus

  @column()
  declare spaceStreamerId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => SpaceStreamer)
  declare spaceStreamer: HasOne<typeof SpaceStreamer>

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  serializeAsSession(): SpotifyUserSession {
    const result = {
      id: this.id,
    } as SpotifyUserSession
    return result
  }

  isAccessTokenExpired(): boolean {
    return DateTime.now() >= this.tokenExpiresAt
  }

  async refreshAccessToken(): Promise<RefreshTokenResponse> {
    const credentials = Buffer.from(
      `${env.get('SPOTIFY_CLIENT_ID')}:${env.get('SPOTIFY_CLIENT_SECRET')}`
    ).toString('base64')

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    })

    try {
      const tokenResponse = await axios.post(
        'https://accounts.spotify.com/api/token',
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      console.log('tokenResponse', tokenResponse.data)

      return tokenResponse.data as RefreshTokenResponse
    } catch (error) {
      console.log('error', error)
      throw ApiError.newError('ERROR_INVALID_DATA', 'SMRT-1')
    }
  }
}
