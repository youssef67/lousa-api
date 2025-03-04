import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { randomUUID } from 'node:crypto'
import SpaceStreamer from '../app/models/space_streamer.js'
import TwitchUser from '#models/twitch_user'
import Playlist from '#models/playlist'
import User from '#models/user'
import { ModelStatus } from '#types/model_status'
import { TwitchUserFactory } from '../database/factories/twitch_user_factory.js'
import { SpotifyUserFactory } from '#database/factories/spotify_user_factory'

export default class SpaceStreamerGenerate extends BaseCommand {
  static commandName = 'spaces:generate'
  static description = 'Generate a specified number of spaceStream'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating spaceStreamer...`)

      await this.cleanOldData()
      const users = await this.getUsers()

      if (!users) {
        this.logger.error('No twitchUsers created')
        return
      }

      await this.createTwitchProfiles(users)
      await this.createSpotifyProfiles(users)
    } catch (error) {
      console.error(error)
      this.logger.error(`Failed to generate spaceStreamer: ${error.message}`)
    }
  }

  async cleanOldData() {
    const viewers = await User.query().whereNotNull('playlist_selected')

    if (!viewers) {
      throw new Error(`Users with playlist_selected at NULL are not found`)
    }

    for (const viewer of viewers) {
      await viewer.related('favoritesPlaylists').detach()
      await viewer.related('favoritesSpaceStreamers').detach()

      await User.query().where('id', viewer.id).update({
        playlistSelected: null,
      })
    }

    const streamerUser = await User.query().whereLike('email', '%streamer%')
    const streamerUserIds = new Set(streamerUser.map((user) => user.id))

    if (streamerUser.length === 0) return

    const twitchUsers = await TwitchUser.query().whereIn('userId', Array.from(streamerUserIds))
    const twitchUserIds = new Set(twitchUsers.map((twitchUser) => twitchUser.id))

    const spaceStreamers = await SpaceStreamer.query().whereIn(
      'twitchUserId',
      Array.from(twitchUserIds)
    )

    const spaceStreamerIds = new Set(spaceStreamers.map((spaceStreamer) => spaceStreamer.id))

    await SpaceStreamer.query().whereIn('id', Array.from(spaceStreamerIds)).update({
      twitchUserId: null,
      nameSpace: null,
    })

    await Playlist.query().whereIn('spaceStreamerId', Array.from(spaceStreamerIds)).delete()
    await TwitchUser.query().whereIn('userId', Array.from(streamerUserIds)).delete()
  }

  // Get users with email like 'streamer'
  async getUsers() {
    const streamerUsers = await User.query().whereLike('email', '%streamer%')

    const randomSpaceStreamers = await SpaceStreamer.query()
      .limit(streamerUsers.length)
      .orderByRaw('RANDOM()')

    if (randomSpaceStreamers.length < streamerUsers.length) {
      this.logger.error('Pas assez de SpaceStreamers disponibles')
      return
    }

    return { users: streamerUsers, spaceStreamers: randomSpaceStreamers }
  }

  // Create twitch Profiles
  async createTwitchProfiles({
    users,
    spaceStreamers,
  }: {
    users: User[]
    spaceStreamers: SpaceStreamer[]
  }) {
    const twitchUsersData = users.map((user, index) => ({
      userId: user.id,
      spaceStreamerId: spaceStreamers[index].id,
      twitchId: randomUUID(),
      twitchUserLogin: spaceStreamers[index].twitchUserLogin,
      emailTwitch: user.email,
      twitchUserImgProfile: spaceStreamers[index].spaceStreamerImg,
      status: ModelStatus.Enabled,
    }))

    const createdTwitchUsers = await TwitchUserFactory.merge(twitchUsersData).createMany(
      users.length
    )

    const updates = createdTwitchUsers.map((twitchUser, index) => ({
      id: spaceStreamers[index].id,
      twitchUserId: twitchUser.id,
      nameSpace: twitchUser.twitchUserLogin,
    }))

    await Promise.all(
      updates.map((update) =>
        SpaceStreamer.query().where('id', update.id).update({
          twitchUserId: update.twitchUserId,
          nameSpace: update.nameSpace,
        })
      )
    )

    return createdTwitchUsers
  }

  // Create Spotify Profiles
  async createSpotifyProfiles({
    users,
    spaceStreamers,
  }: {
    users: User[]
    spaceStreamers: SpaceStreamer[]
  }) {
    const SpotifyUsersData = users.map((user, index) => ({
      userId: user.id,
      spaceStreamerId: spaceStreamers[index].id,
      spotifyId: randomUUID(),
      status: ModelStatus.Enabled,
    }))

    const createdSpotifyUsers = await SpotifyUserFactory.merge(SpotifyUsersData).createMany(
      users.length
    )

    const updates = createdSpotifyUsers.map((spotifyUser, index) => ({
      id: spaceStreamers[index].id,
      spotifyUserId: spotifyUser.id,
    }))

    await Promise.all(
      updates.map((update) =>
        SpaceStreamer.query().where('id', update.id).update({
          spotifyUserId: update.spotifyUserId,
        })
      )
    )
  }
}
