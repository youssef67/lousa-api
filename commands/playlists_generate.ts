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

export default class PlaylistsGenerate extends BaseCommand {
  static commandName = 'playlists:generate'
  static description = 'Generate a specified number of playlists'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description: 'email of user to generate for',
    required: true,
  })
  declare emailUser: string

  @args.string({
    description: 'Number of playlists to generate',
    required: true,
  })
  declare numberPlaylists?: string

  async run() {
    const nbPlaylists = Number.parseInt(this.numberPlaylists!)
    if (Number.isNaN(nbPlaylists) || nbPlaylists <= 0) {
      this.logger.error('Please provide a valid positive number for user.')
      return
    }

    try {
      this.logger.info(`Generating ${nbPlaylists} users...`)

      await this.cleanOldData()
      await this.createPlaylists()
      // await this.createAdminUser()
      // await this.createStreamersList()

      // const users = await this.createUsers()

      // await this.setUsersStreamerProfile()
      // this.logger.success(`Successfully generated ${nbPlaylists.length} users!`)
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate users: ${error.message}`)
    }
  }

  // Utility function to load the user factory
  private async getPlaylistFactory() {
    const playlistFactoryModule = await import('../database/factories/playlist_factory.js')
    return playlistFactoryModule.PlaylistFactory
  }

  async cleanOldData() {
    const twitchUser = await this.getTwitchUserData()

    await Playlist.query().where('space_streamer_id', twitchUser.spaceStreamerId).delete()
  }

  async getTwitchUserData() {
    const getUser = await User.query().where('email', this.emailUser).first()

    if (!getUser) {
      throw new Error(`User with email ${this.emailUser} not found`)
    }

    const getTwitchUser = await TwitchUser.query().where('userId', getUser.id).first()

    if (!getTwitchUser) {
      throw new Error(`Twitch user with userId ${getUser.id} not found`)
    }

    return getTwitchUser
  }

  async createPlaylists() {
    const playlistsFactory = await this.getPlaylistFactory()

    let twitchUser = await this.getTwitchUserData()
    let nbPlaylists = Number.parseInt(this.numberPlaylists!)

    for (let index = 0; index < nbPlaylists; index++) {
      const randomPlaylist = playlistNames[Math.floor(Math.random() * playlistNames.length)]

      await playlistsFactory
        .merge({
          spaceStreamerId: twitchUser.spaceStreamerId,
          spotifyPlaylistId: randomPlaylist.spotifyId,
          playlistName: `${randomPlaylist.playlistName}-${index}`,
          status: ModelStatus.Enabled,
        })
        .create()
    }
  }
}
