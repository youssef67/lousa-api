import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import VersusService from '#services/versus_service'
import { TracksVersusStatus } from '#types/versus.status'
import TracksVersus from '#models/tracks_versus'

const getTracksVersus = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // Get the playlist
  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('tracksVersus', (tracksVersusQuery) => {
      tracksVersusQuery.preload('firstTrack')
      tracksVersusQuery.preload('secondTrack')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGTV-1')
  }

  let trackVersus = await TracksVersus.query()
    .where('playlist_id', playlistId)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .orWhere('status', TracksVersusStatus.MissingTracks)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await VersusService.activationTracksVersus(playlistId)
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  return response.ok({
    currentTracksVersus,
  })
}

export default getTracksVersus
