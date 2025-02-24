import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { UserRole } from '#types/user_role'
import { randomUUID } from 'node:crypto'
import { generateToken } from '#utils/authentication.utils'
import { DateTime } from 'luxon'
import { playlistNames } from '#data/playlists_names'
import SpaceStreamer from '../app/models/space_streamer.js'
import TwitchUser from '#models/twitch_user'
import Playlist from '#models/playlist'
import User from '#models/user'
import { ModelStatus } from '#types/model_status'
import { TwitchUserFactory } from '../database/factories/twitch_user_factory.js'
import { stat } from 'node:fs'

export default class SpaceStreamerGenerate extends BaseCommand {
  static commandName = 'space:generate'
  static description = 'Generate a specified number of spaceStream'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating spaceStreamer...`)

      await this.cleanOldData()
      const twitchUsers = await this.createTwitchUsers()

      if (!twitchUsers) {
        this.logger.error('No twitchUsers created')
        return
      }

      await this.createPlaylists(twitchUsers)
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate spaceStreamer: ${error.message}`)
    }
  }

  private async getSpacePlaylistFactory() {
    const playlistFactoryModule = await import('../database/factories/playlist_factory.js')
    return playlistFactoryModule.PlaylistFactory
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

  async createTwitchUsers() {
    const streamerUsers = await User.query().whereLike('email', '%streamer%')

    // Get 15 random spaceStreamer
    const randomSpaceStreamers = await SpaceStreamer.query()
      .limit(streamerUsers.length)
      .orderByRaw('RANDOM()')

    if (randomSpaceStreamers.length < streamerUsers.length) {
      this.logger.error('Pas assez de SpaceStreamers disponibles')
      return
    }

    const twitchUsersData = streamerUsers.map((user, index) => ({
      userId: user.id,
      spaceStreamerId: randomSpaceStreamers[index].id,
      twitchId: randomUUID(),
      twitchUserLogin: randomSpaceStreamers[index].twitchUserLogin,
      emailTwitch: user.email,
      twitchUserImgProfile: randomSpaceStreamers[index].spaceStreamerImg,
      status: ModelStatus.Enabled,
    }))

    const createdTwitchUsers = await TwitchUserFactory.merge(twitchUsersData).createMany(
      streamerUsers.length
    )

    const updates = createdTwitchUsers.map((twitchUser, index) => ({
      id: randomSpaceStreamers[index].id,
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

  async createPlaylists(twitchUsers: TwitchUser[]) {
    const playlistFactory = await this.getSpacePlaylistFactory()

    for (const twitchUser of twitchUsers) {
      const playlists = playlistNames.map((playlist, index) => ({
        spaceStreamerId: twitchUser.spaceStreamerId,
        spotifyPlaylistId: randomUUID(),
        playlistName: playlist.playlistName,
        status: ModelStatus.Enabled,
      }))

      await Promise.all(playlists.map((playlist) => playlistFactory.merge(playlist).create()))
    }
  }
}
