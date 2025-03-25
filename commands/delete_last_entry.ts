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
      .where('track_id', '0dd6c050-bca4-4267-80b1-22b44df81200')
      .andWhere('playlist_id', '169cdd5e-4bcb-4108-97f5-090c40761bb4')
      .first()

    if (!lastEntry) {
      this.logger.warning('Aucune entrée trouvée.')
      return
    }

    console.log('lastEntry ', lastEntry)

    await lastEntry.delete()
    this.logger.success(`✅ Entrée ID ${lastEntry.id} supprimée.`)

    const winnerEntry = await TracksVersus.query().whereNotNull('winner').first()

    if (winnerEntry) {
      winnerEntry.winner = null
      await winnerEntry.save()
      this.logger.success(`✅ Entrée gagnante ID ${winnerEntry.id} réinitialisée.`)
    }
  }
}
