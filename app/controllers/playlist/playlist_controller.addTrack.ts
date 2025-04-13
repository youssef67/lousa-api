import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import Playlist from '#models/playlist'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const tracksVersusId = request.input('tracksVersusId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // 1. Charger et valider le Versus
  const tracksVersusExisting = await TracksVersus.query().where('id', tracksVersusId).first()

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
  }

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

  let trackVersus: TracksVersus | null

  trackVersus = await TracksVersus.query()
    .where('playlist_id', tracksVersusExisting.playlistId)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await TracksVersus.query()
      .where('playlist_id', tracksVersusExisting.playlistId)
      .andWhere('status', TracksVersusStatus.MissingTracks)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  return response.ok({
    playlistsTracks: playlistsTracks,
    currentTracksVersus,
  })
}

export default addTrack
