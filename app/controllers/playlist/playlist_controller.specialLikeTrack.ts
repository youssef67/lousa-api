import type { HttpContext } from '@adonisjs/core/http'
import { SpecialLikeTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizeScoreAndLikes, sanitizeUser } from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { BroadcasterVersus } from '#interfaces/playlist_interface'
import User from '#models/user'

const specialLikeTrack = async ({ request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(SpecialLikeTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  console.log('payload', payload)
  const tracksVersusExisting = await TracksVersus.find(payload.tracksVersusId)

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSL-2')
  }

  let TracksVersusUpdated: BroadcasterVersus | null = null
  let UserUpdated: User | null = null
  await db.transaction(async (trx) => {
    UserUpdated = await VersusService.SpecialLikeTrack(
      tracksVersusExisting,
      currentUser,
      payload.targetTrack,
      payload.amount,
      trx
    )

    TracksVersusUpdated = await VersusService.getTracksVersusBroadcasted(
      tracksVersusExisting.playlistId,
      currentUser.id,
      trx
    )
  })

  const scoreAndLikes = TracksVersusUpdated ? sanitizeScoreAndLikes(TracksVersusUpdated) : null
  const user = UserUpdated ? sanitizeUser(UserUpdated) : null

  transmit.broadcast(`playlist/like/${payload.tracksVersusId}`, {
    scoreAndLikes,
    user,
  })
}

export default specialLikeTrack
