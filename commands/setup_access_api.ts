import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import TwitchUser from '#models/twitch_user'
import SpotifyUser from '#models/spotify_user'
import { ModelStatus } from '#types/model_status'
import User from '#models/user'

export default class SetupApiGenerate extends BaseCommand {
  static commandName = 'setup:api'
  static description = 'set all access API'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating access to API for Streamers...`)
      await this.updateStreamersNotConnected()
      await this.updateUsers()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate access: ${error.message}`)
    }
  }

  async updateStreamersNotConnected() {
    const twitchUser = await TwitchUser.query().whereNotNull('access_token').first()
    const spotifyUser = await SpotifyUser.query().whereNotNull('access_token').first()

    if (!twitchUser || !spotifyUser) {
      throw new Error(`User with access token is not found`)
    }

    await TwitchUser.query().whereNull('access_token').update({
      state: ModelStatus.Enabled,
      accessToken: twitchUser.accessToken,
      refreshToken: twitchUser.refreshToken,
      tokenExpiresAt: twitchUser.tokenExpiresAt,
    })

    await SpotifyUser.query().whereNull('access_token').update({
      spotifyId: spotifyUser.spotifyId,
      accessToken: spotifyUser.accessToken,
      refreshToken: spotifyUser.refreshToken,
      tokenExpiresAt: spotifyUser.tokenExpiresAt,
      scope: spotifyUser.scope,
    })
  }

  async updateUsers() {
    const twitchUsers = await TwitchUser.query()
    const spotifyUsers = await SpotifyUser.query()

    if (!twitchUsers || !spotifyUsers) {
      throw new Error(`Users with access token is not found`)
    }

    for (const twitchUser of twitchUsers) {
      const user = await User.query().where('id', twitchUser.userId).first()

      if (!user) {
        throw new Error(`User with id ${twitchUser.id} is not found`)
      }

      await User.query().where('id', twitchUser.userId).update({
        twitchUserId: twitchUser.id,
      })
    }

    for (const spotifyUser of spotifyUsers) {
      const user = await User.query().where('id', spotifyUser.userId).first()

      if (!user) {
        throw new Error(`User with id ${spotifyUser.id} is not found`)
      }

      await User.query().where('id', spotifyUser.userId).update({
        spotifyUserId: spotifyUser.id,
      })
    }
  }
}
