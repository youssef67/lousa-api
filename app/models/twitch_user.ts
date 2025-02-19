import { DateTime } from 'luxon'
import axios from 'axios'
import { BaseModel, belongsTo, hasOne, column } from '@adonisjs/lucid/orm'
import ApiError from '#types/api_error'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { RefreshTokenResponse } from '#interfaces/twitch_interface'
import env from '#start/env'
import { TwitchUserSession } from '#interfaces/common_interface'
import SpaceStreamer from './space_streamer.js'
import { ModelStatus } from '#types/model_status'

export default class TwitchUser extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare twitchId: string

  @column()
  declare displayName: string

  @column()
  declare emailTwitch: string

  @column()
  declare avatarUrl: string

  @column()
  declare viewCount: number

  @column()
  declare state: string

  @column()
  declare accessToken: string

  @column()
  declare refreshToken: string

  @column()
  declare tokenExpiresAt: DateTime

  @column()
  declare isStreamer: boolean

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

  serializeAsSession(): TwitchUserSession {
    const result = {
      id: this.id,
      displayName: this.displayName,
      email: this.emailTwitch,
      isStreamer: this.isStreamer,
    } as TwitchUserSession
    return result
  }

  isAccessTokenExpired(): boolean {
    return DateTime.now() >= this.tokenExpiresAt
  }

  async refreshAccessToken(): Promise<RefreshTokenResponse> {
    const credentials = Buffer.from(
      `${env.get('TWITCH_CLIENT_ID')}:${env.get('TWITCH_CLIENT_SECRET')}`
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

      return tokenResponse.data as RefreshTokenResponse
    } catch (error) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SMRT-1')
    }
  }
}
