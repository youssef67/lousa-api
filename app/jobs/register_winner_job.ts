import transmit from '@adonisjs/transmit/services/main'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import PlaylistService from '#services/playlist_service'
import SpotifyService from '#services/spotify_service'
import VersusService from '#services/versus_service'
import ApiError from '#types/api_error'
import { sanitizePlaylistTracks, sanitizeTracksVersus } from '#utils/sanitize_broadcast'
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
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
    }
    // 2. Charger la playlist avec le spotify user

    const playlist = await PlaylistService.getPlaylistWithSpotifyUser(
      tracksVersusExisting.playlistId
    )

    // 3. Transaction principale
    // let rankedTracks: PlaylistTrack[] = []
    // let nextTracksVersus: TracksVersus | null = {} as TracksVersus
    await db.transaction(async (trx) => {
      // a. Enregistrer le gagnant
      const res = await VersusService.registerWinner(tracksVersusExisting, trx)
      // nextTracksVersus = res.nextTracksVersus
      // b. Ajouter le track et réordonner

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
      // rankedTracks = await PlaylistService.getPlaylistTracksRanked(
      //   tracksVersusExisting.playlistId,
      //   trx
      // )
    })

    // 4. Formatter les données pour la diffusion
    // const trackIds = rankedTracks.map((t) => t.trackId)

    // const allTracks = await Track.query()
    //   .whereIn('id', trackIds)
    //   .preload('playlistTracks', (query) => {
    //     query.preload('user')
    //   })

    // const trackMap = new Map(allTracks.map((t) => [t.id, t]))

    // const playlistTracksUpdated = rankedTracks.map((track) => {
    //   const data = trackMap.get(track.trackId)
    //   if (!data) throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-3')
    //   return {
    //     ...data.serializeTrack(),
    //     ...track.serializePlaylistTrack(),
    //   }
    // })

    // // 5. Broadcast de la nouvelle playlist
    // const cleanTracks = sanitizePlaylistTracks(playlistTracksUpdated)

    // console.log('tracksVersusExisting.playlistId', tracksVersusExisting.playlistId)
    // transmit.broadcast(`playlist/updated/${tracksVersusExisting.playlistId}`, {
    //   playlistTracksUpdated: cleanTracks,
    // })

    // const currentTracksVersus = await VersusService.tracksVersusBroadcasted(nextTracksVersus, null)

    // console.log('currentTracksVersus', currentTracksVersus)
    // transmit.broadcast(`playlist/tracksVersus/${tracksVersusExisting.playlistId}`, {
    //   currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
    // })
  }

  /**
   * This is an optional method that gets called when the retries has exceeded and is marked failed.
   */
  async rescue(payload: RegisterWinnerJobPayload) {}
}
