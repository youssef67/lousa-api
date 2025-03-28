import type { HttpContext } from '@adonisjs/core/http'
import { addTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizePlaylistTracks, sanitizeTracksVersus } from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import VersusService from '#services/versus_service'
import SpotifyService from '#services/spotify_service'
import PlaylistService from '#services/playlist_service'
import { BroadcasterVersus } from '#interfaces/playlist_interface'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addTrackValidator)
  await currentDevice.load('user')

  const maxTrackOnPlaylist = 20

  // 1. Charger et valider le Versus
  const tracksVersus = await VersusService.validateAndGetVersus(payload.versusId)
  if (!tracksVersus) return response.ok({ playlistTracksUpdated: [] })

  // 2. Charger la playlist avec le spotify user
  const playlist = await PlaylistService.getPlaylistWithSpotifyUser(tracksVersus.playlistId)

  // 3. Transaction principale
  let rankedTracks: PlaylistTrack[] = []
  let newTracksVersus: BroadcasterVersus | null = null
  await db.transaction(async (trx) => {
    // a. Enregistrer le gagnant
    const winnerTrack = await VersusService.registerWinner(tracksVersus, trx)
    // b. Ajouter le track et réordonner
    console.log('Winner track 1', winnerTrack)

    if (winnerTrack.trackId) {
      console.log('Winner track 2', winnerTrack)
      rankedTracks = await PlaylistService.addRankedTrackAndReorder(
        {
          playlistId: tracksVersus.playlistId,
          trackId: winnerTrack.trackId,
          userId: winnerTrack.userId,
          score: winnerTrack.score,
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
        payload.spotifyTrackId!,
        spotifyUser.accessToken
      )
      // f. Mettre à jour le snapshot en BDD
      await PlaylistService.updateSnapshotId(playlist.id, snapshot, trx)
      // g. Créer un nouveau Versus
    } else {
      rankedTracks = await PlaylistService.getPlaylistTracksRanked(tracksVersus.playlistId, trx)
    }

    newTracksVersus = await VersusService.getTracksVersusBroadcasted(playlist.id, trx)
  })

  // 4. Formatter les données pour la diffusion
  const trackIds = rankedTracks.map((t) => t.trackId)
  const allTracks = await Track.query()
    .whereIn('id', trackIds)
    .preload('playlistTracks', (query) => {
      query.preload('user')
    })
  const trackMap = new Map(allTracks.map((t) => [t.id, t]))

  const playlistTracksUpdated = rankedTracks.map((track) => {
    const data = trackMap.get(track.trackId)
    if (!data) throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-3')
    return {
      ...data.serializeTrack(),
      ...track.serializePlaylistTrack(),
    }
  })

  // 5. Broadcast de la nouvelle playlist
  const cleanTracks = sanitizePlaylistTracks(playlistTracksUpdated)
  const cleanVersus = newTracksVersus ? sanitizeTracksVersus(newTracksVersus) : newTracksVersus

  transmit.broadcast(`playlist/updated/${tracksVersus.playlistId}`, {
    playlistTracksUpdated: cleanTracks,
    cleanVersus: cleanVersus,
  })
}

export default addTrack
