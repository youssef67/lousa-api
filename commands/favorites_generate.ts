import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SpaceStreamer from '../app/models/space_streamer.js'
import User from '#models/user'

export default class FavoritesGenerate extends BaseCommand {
  static commandName = 'favorites:generate'
  static description = 'Generate fovorites'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating favorites...`)

      await this.cleanOldData()
      await this.createViewerProfile()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate users: ${error.message}`)
    }
  }

  async cleanOldData() {
    const viewers = await User.all()

    for (const viewer of viewers) {
      await viewer.related('favoritesPlaylists').detach()
      await viewer.related('favoritesSpaceStreamers').detach()
    }

    await User.query().whereNotNull('playlist_selected').update({
      playlistSelected: null,
    })
  }

  async createViewerProfile() {
    const viewers = await User.query()
      .whereLike('email', '%viewer%')
      .andWhereLike('email', '%viewer-4%')
      .limit(5)
      .orderByRaw('RANDOM()')

    if (viewers.length === 0) {
      throw new Error(`Users not found`)
    }

    const spaceStreamers = await SpaceStreamer.query().whereNotNull('twitch_user_id')

    for (const viewer of viewers) {
      for (const spaceStreamer of spaceStreamers) {
        await viewer.related('favoritesSpaceStreamers').attach([spaceStreamer.id])

        await spaceStreamer.load('playlists')

        for (const playlist of spaceStreamer.playlists) {
          if (!viewer.playlistSelected) {
            await User.query().where('id', viewer.id).update({
              playlistSelected: playlist.id,
            })
          }
          await viewer.related('favoritesPlaylists').attach([playlist.id])
        }
      }
    }
  }
}
