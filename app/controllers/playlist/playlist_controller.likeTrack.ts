import type { HttpContext } from '@adonisjs/core/http'
import { likeTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizeScoreAndLikes } from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { BroadcasterVersus } from '#interfaces/playlist_interface'
import LikeTrack from '#models/like_track'

const likeTrack = async ({ request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(likeTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const tracksVersusExisting = await TracksVersus.find(payload.tracksVersusId)

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCLA-1')
  }

  const checkIfTrackAlreadyLiked = await LikeTrack.query()
    .where('user_id', currentUser.id)
    .andWhere('track_id', payload.trackId)
    .andWhere('tracks_versus_id', payload.tracksVersusId)
    .first()

  if (checkIfTrackAlreadyLiked) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCLA-3')
  }

  let TracksVersusUpdated: BroadcasterVersus | null = null
  await db.transaction(async (trx) => {
    await VersusService.likeTrack(
      tracksVersusExisting,
      payload.trackId,
      currentUser.id,
      payload.targetTrack,
      trx
    )

    TracksVersusUpdated = await VersusService.getTracksVersusBroadcasted(
      tracksVersusExisting.playlistId,
      currentUser.id,
      trx
    )
  })

  const scoreAndLikes = TracksVersusUpdated ? sanitizeScoreAndLikes(TracksVersusUpdated) : null

  transmit.broadcast(`playlist/like/${payload.tracksVersusId}`, {
    scoreAndLikes,
  })
}

export default likeTrack
