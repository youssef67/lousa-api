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
      await this.createViewerFour()
      // await this.createViewerProfile()
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

  async createViewerFour() {
    const viewerFour = await User.query().whereLike('email', '%viewer-4%').first()

    if (!viewerFour) {
      throw new Error(`User not found`)
    }

    const spaceStreamers = await SpaceStreamer.query()
      .whereNotNull('twitch_user_id')
      .has('playlists')
      .preload('playlists')

    const nbToPick = this.getRandomInt(1, spaceStreamers.length)
    const spaceStreamersRandom = await this.getRandomElements(spaceStreamers, nbToPick)

    for (const spaceStreamer of spaceStreamersRandom) {
      await viewerFour.related('favoritesSpaceStreamers').attach([spaceStreamer.id])

      await spaceStreamer.load('playlists')

      const playlistsRandom = await this.getRandomElements(
        spaceStreamer.playlists,
        Math.floor(Math.random() * (3 - 1 + 1)) + 1
      )

      for (const playlist of playlistsRandom) {
        if (!viewerFour.playlistSelected) {
          await User.query().where('id', viewerFour.id).update({
            playlistSelected: playlist.id,
          })
        }
        await viewerFour.related('favoritesPlaylists').attach([playlist.id])
      }
    }
  }

  async createViewerProfile() {
    const nbViewers = Math.floor(Math.random() * (20 - 10 + 1)) + 10

    const viewers = await User.query()
      .whereLike('email', '%viewer%')
      .whereRaw('email NOT LIKE ?', ['%viewer-4%'])
      .orderByRaw('RANDOM()')
      .limit(nbViewers)

    if (viewers.length === 0) {
      throw new Error(`Users not found`)
    }

    const spaceStreamers = await SpaceStreamer.query().whereNotNull('twitch_user_id')

    for (const viewer of viewers) {
      const nbToPick = this.getRandomInt(1, spaceStreamers.length)
      const spaceStreamersRandom = await this.getRandomElements(spaceStreamers, nbToPick)

      for (const spaceStreamer of spaceStreamersRandom) {
        await viewer.related('favoritesSpaceStreamers').attach([spaceStreamer.id])

        await spaceStreamer.load('playlists')

        const playlistsRandom = await this.getRandomElements(
          spaceStreamer.playlists,
          Math.floor(Math.random() * (3 - 1 + 1)) + 1
        )

        for (const playlist of playlistsRandom) {
          if (!viewer.playlistSelected) {
            const randomPlaylist =
              playlistsRandom[Math.floor(Math.random() * playlistsRandom.length)]

            await User.query().where('id', viewer.id).update({
              playlistSelected: randomPlaylist.id,
            })
          }

          await viewer.related('favoritesPlaylists').attach([playlist.id])
        }
      }
    }
  }

  async getRandomElements(arr: any[], count: number): Promise<SpaceStreamer[]> {
    const shuffled = [...arr].sort(() => 0.5 - Math.random()) // on mélange
    return shuffled.slice(0, count) // on prend les n premiers
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
