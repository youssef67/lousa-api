import type { HttpContext } from '@adonisjs/core/http'
import { likeTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizeTracksVersus } from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import LikeTrack from '#models/like_track'

const likeTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(likeTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const checkIfTrackAlreadyLiked = await LikeTrack.query()
    .where('user_id', currentUser.id)
    .andWhere('track_id', payload.trackId)
    .andWhere('tracks_versus_id', payload.tracksVersusId)
    .first()

  if (checkIfTrackAlreadyLiked) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCLA-1')
  }

  let tracksVersusUpdated: TracksVersus | null = null

  await db.transaction(async (trx) => {
    await VersusService.likeTrack(
      payload.tracksVersusId,
      payload.trackId,
      currentUser.id,
      payload.targetTrack,
      trx
    )

    tracksVersusUpdated = await TracksVersus.query({ client: trx })
      .where('id', payload.tracksVersusId)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()
  })

  if (tracksVersusUpdated as unknown as TracksVersus) {
    const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
      tracksVersusUpdated,
      currentUser.id
    )

    transmit.broadcast(`playlist/like/${tracksVersusUpdated!.playlistId}`, {
      currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
    })

    return response.ok({ result: true })
  } else {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCLA-2')
  }
}

export default likeTrack
