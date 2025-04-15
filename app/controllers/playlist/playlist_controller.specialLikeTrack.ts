import type { HttpContext } from '@adonisjs/core/http'
import { SpecialLikeTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizeTracksVersus } from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'

const specialLikeTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(SpecialLikeTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const tracksVersusExisting = await TracksVersus.find(payload.tracksVersusId)

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSL-2')
  }

  let tracksVersusUpdated: TracksVersus | null = null
  let userUpdated: User = {} as User
  await db.transaction(async (trx) => {
    userUpdated = await VersusService.SpecialLikeTrack(
      payload.tracksVersusId,
      currentUser,
      payload.targetTrack,
      payload.amount,
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

    return response.ok({ user: userUpdated.serializeAsSession() })
  } else {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCLA-2')
  }
}

export default specialLikeTrack
