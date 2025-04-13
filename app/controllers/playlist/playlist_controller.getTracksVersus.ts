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
  const playlist = await Playlist.query().where('id', playlistId).first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGTV-1')
  }

  let trackVersus: TracksVersus | null

  trackVersus = await TracksVersus.query()
    .where('playlist_id', playlistId)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await TracksVersus.query()
      .where('playlist_id', playlistId)
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

  console.log(
    'currentTracksVersus',
    currentTracksVersus.firstTrack?.scoreAndLikes?.listOfUserIdWhoLiked
  )

  return response.ok({
    currentTracksVersus,
  })
}

export default getTracksVersus
