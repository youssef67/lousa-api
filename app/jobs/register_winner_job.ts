import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import PlaylistService from '#services/playlist_service'
import SpotifyService from '#services/spotify_service'
import VersusService from '#services/versus_service'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import { Job } from '@rlanz/bull-queue'

interface RegisterWinnerJobPayload {
  tracksVersusId: string
}

export default class RegisterWinnerJob extends Job {
  // This is the path to the file that is used to create the job
  static get $$filepath() {
    return import.meta.url
  }

  /**
   * Base Entry point
   */
  async handle(payload: RegisterWinnerJobPayload) {
    const maxTrackOnPlaylist = 20

    // 1. Charger et valider le Versus
    const tracksVersusExisting = await TracksVersus.query()
      .where('id', payload.tracksVersusId)
      .first()

    if (!tracksVersusExisting) {
      console.error('TracksVersus not found')
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
    }

    const playlist = await PlaylistService.getPlaylistWithSpotifyUser(
      tracksVersusExisting.playlistId
    )

    await db.transaction(async (trx) => {
      // a. Enregistrer le gagnant
      const res = await VersusService.registerWinner(tracksVersusExisting, trx)

      const userWinner = await User.query().where('id', res.winnerTrack.userId).first()

      if (!userWinner) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-2')
      }

      userWinner.victoryPoints += 10
      userWinner.useTransaction(trx)
      await userWinner.save()

      const trackExisting = await Track.query().where('id', res.winnerTrack.trackId).first()

      await PlaylistService.addRankedTrackAndReorder(
        {
          playlistId: tracksVersusExisting.playlistId,
          trackId: res.winnerTrack.trackId,
          userId: res.winnerTrack.userId,
          score: res.winnerTrack.score,
          specialScore: res.winnerTrack.specialScore,
          maxTracks: maxTrackOnPlaylist,
        },
        trx
      )

      // d. Assurer un token Spotify valide
      const spotifyUser = await SpotifyService.ensureValidToken(
        playlist.spaceStreamer.spotifyUser,
        trx
      )
      // e. Ajouter la track dans la playlist Spotify
      const snapshot = await SpotifyService.addTrackToSpotifyPlaylist(
        playlist,
        trackExisting?.spotifyTrackId!,
        spotifyUser.accessToken
      )
      // f. Mettre à jour le snapshot en BDD
      await PlaylistService.updateSnapshotId(playlist.id, snapshot, trx)
    })
  }

  /**
   * This is an optional method that gets called when the retries has exceeded and is marked failed.
   */
  async rescue(payload: RegisterWinnerJobPayload) {}
}
