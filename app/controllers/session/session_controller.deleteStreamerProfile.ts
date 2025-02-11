import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'
import { ModelStatus } from '#types/model_status'
import loggerW from '#config/winston_logger'
import { generateToken } from '#utils/authentication.utils'

const deleteStreamerProfile = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const streamerProfile = await TwitchUser.query()
    .where('userId', currentUser.id)
    .andWhere('status', ModelStatus.Enabled)
    .first()

  if (!streamerProfile) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCDS-1')
  }

  try {
    await db.transaction(async (trx) => {
      streamerProfile.status = ModelStatus.Deleted
      streamerProfile.accessToken = generateToken(currentUser.id)
      streamerProfile.refreshToken = generateToken(currentUser.id)
      streamerProfile.useTransaction(trx)
      await streamerProfile.save()
    })
  } catch (error) {
    loggerW.error(error)
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCDS-2')
  }

  return response.ok({ result: true })
}

export default deleteStreamerProfile
