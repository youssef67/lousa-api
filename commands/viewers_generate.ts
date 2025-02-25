import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { randomUUID } from 'node:crypto'
import SpaceStreamer from '../app/models/space_streamer.js'
import User from '#models/user'

export default class ViewersGenerate extends BaseCommand {
  static commandName = 'viewers:generate'
  static description = 'Generate viewers'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating viewers...`)

      await this.cleanOldData()
      await this.createViewerProfile()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate users: ${error.message}`)
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
    }

    for (const viewer of viewers) {
      await User.query().where('id', viewer.id).update({
        playlistSelected: null,
      })
    }
  }

  async createViewerProfile() {
    const viewers = await User.query()
      .whereLike('email', '%viewer%')
      .limit(2)
      .orderByRaw('RANDOM()')

    if (viewers.length === 0) {
      throw new Error(`Users not found`)
    }

    for (const viewer of viewers) {
      await User.query().where('id', viewer.id).update({
        playlistSelected: randomUUID(),
      })
    }

    const spaceStreamers = await SpaceStreamer.query().whereNotNull('twitch_user_id')
    const defineNbSpaceStreamer = Math.floor(Math.random() * spaceStreamers.length) + 1
    const defineNbPlaylists = Math.floor(Math.random() * (10 - 3 + 1)) + 3

    const randomFavoriteStreamers = spaceStreamers
      .sort(() => 0.5 - Math.random())
      .slice(0, defineNbSpaceStreamer)

    for (const viewer of viewers) {
      for (const spaceStreamer of randomFavoriteStreamers) {
        await viewer.related('favoritesSpaceStreamers').attach([spaceStreamer.id])

        await spaceStreamer.load('playlists')

        const randomPlaylists = spaceStreamer.playlists
          .sort(() => 0.5 - Math.random())
          .slice(0, defineNbPlaylists)

        for (const playlist of randomPlaylists) {
          await viewer.related('favoritesPlaylists').attach([playlist.id])
        }
      }
    }
  }
}
