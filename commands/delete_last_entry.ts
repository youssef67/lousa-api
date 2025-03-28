import { BaseCommand } from '@adonisjs/core/ace'
import PlaylistTrack from '#models/playlist_track'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import TracksVersus from '#models/tracks_versus'
import Playlist from '#models/playlist'

export default class DeleteLastEntry extends BaseCommand {
  static commandName = 'delete:last'

  static description = 'Supprime la dernière entrée de la table spécifiée'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info('🔍 Recherche de la dernière entrée…')

      await this.clean()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate users: ${error.message}`)
    }
  }

  async clean() {
    const lastEntry = await PlaylistTrack.query()
      .where('track_id', '3bed7e79-7e25-4974-8d2d-05efefa82fec')
      .andWhere('playlist_id', 'bdb7b326-7733-41ff-8063-5e5566199fef')
      .first()

    if (!lastEntry) {
      this.logger.warning('Aucune entrée trouvée.')
      return
    }

    await lastEntry.delete()
    this.logger.success(`✅ Entrée ID ${lastEntry.id} supprimée.`)

    const winnerEntry = await TracksVersus.query().whereNotNull('track_winner').first()

    if (winnerEntry) {
      winnerEntry.trackWinner = null
      winnerEntry.UserWinner = null
      await winnerEntry.save()
      this.logger.success(`✅ Entrée gagnante ID ${winnerEntry.id} réinitialisée.`)
    }
  }
}
