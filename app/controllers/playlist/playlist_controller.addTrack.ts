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
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import Playlist from '#models/playlist'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const tracksVersusId = request.input('tracksVersusId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const maxTrackOnPlaylist = 20

  // 1. Charger et valider le Versus
  const tracksVersusExisting = await TracksVersus.query().where('id', tracksVersusId).first()

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
  }

  // 2. Charger la playlist avec le spotify user

  // const playlist = await PlaylistService.getPlaylistWithSpotifyUser(tracksVersusExisting.playlistId)

  // 3. Transaction principale
  // let rankedTracks: PlaylistTrack[] = []
  // let nextTracksVersus: TracksVersus | null = {} as TracksVersus
  // await db.transaction(async (trx) => {
  //   // a. Enregistrer le gagnant
  //   const res = await VersusService.registerWinner(tracksVersusExisting, trx)
  //   nextTracksVersus = res.nextTracksVersus
  //   // b. Ajouter le track et réordonner

  //   const trackExisting = await Track.query().where('id', res.winnerTrack.trackId).first()

  //   rankedTracks = await PlaylistService.addRankedTrackAndReorder(
  //     {
  //       playlistId: tracksVersusExisting.playlistId,
  //       trackId: res.winnerTrack.trackId,
  //       userId: res.winnerTrack.userId,
  //       score: res.winnerTrack.score,
  //       specialScore: res.winnerTrack.specialScore,
  //       maxTracks: maxTrackOnPlaylist,
  //     },
  //     trx
  //   )

  //   // d. Assurer un token Spotify valide
  //   const spotifyUser = await SpotifyService.ensureValidToken(
  //     playlist.spaceStreamer.spotifyUser,
  //     trx
  //   )
  //   // e. Ajouter la track dans la playlist Spotify
  //   const snapshot = await SpotifyService.addTrackToSpotifyPlaylist(
  //     playlist,
  //     trackExisting?.spotifyTrackId!,
  //     spotifyUser.accessToken
  //   )
  //   // f. Mettre à jour le snapshot en BDD
  //   await PlaylistService.updateSnapshotId(playlist.id, snapshot, trx)
  //   rankedTracks = await PlaylistService.getPlaylistTracksRanked(
  //     tracksVersusExisting.playlistId,
  //     trx
  //   )
  // })

  // const rankedTracks = await PlaylistTrack.query()
  //   .where('playlist_id', tracksVersusExisting.playlistId)
  //   .andWhere('is_ranked', true)
  //   .preload('user')
  //   .orderBy('score', 'desc')
  //   .orderBy('created_at', 'asc')

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

  // 5. Broadcast de la nouvelle playlist
  // const cleanTracks = sanitizePlaylistTracks(playlistTracksUpdated)

  // transmit.broadcast(`playlist/updated/${tracksVersusExisting.playlistId}`, {
  //   playlistTracksUpdated: cleanTracks,
  // })

  const playlist = await Playlist.query()
    .where('id', tracksVersusExisting.playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .preload('spaceStreamer')
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PUGP-1')
  }

  const playlistsTracks = await Promise.all(
    playlist.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCGP-2')
      }

      return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
    })
  )

  // const nextTracksVersus = await TracksVersus.query()
  //   .where('status', TracksVersusStatus.VotingProgress)
  //   .andWhere('playlist_id', tracksVersusExisting.playlistId)
  //   .preload('firstTrack')
  //   .preload('secondTrack')
  //   .preload('likeTracks')
  //   .orderBy('created_at', 'asc')
  //   .first()

  // const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
  //   nextTracksVersus,
  //   currentUser.id
  // )

  // transmit.broadcast(`playlist/tracksVersus/${tracksVersusExisting.playlistId}`, {
  //   currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
  // })
  let trackVersus = await TracksVersus.query()
    .where('playlist_id', tracksVersusExisting.playlistId)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await VersusService.activationTracksVersus(tracksVersusExisting.playlistId)
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  console.log('playlistsTracks', playlistsTracks)
  console.log('currentTracksVersus', currentTracksVersus)

  return response.ok({
    playlistsTracks: playlistsTracks,
    currentTracksVersus,
  })
}

export default addTrack
