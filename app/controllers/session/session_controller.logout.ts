import type { HttpContext } from '@adonisjs/core/http'
import { generateToken } from '#utils/authentication.utils'
import db from '@adonisjs/lucid/services/db'
import ApiError from '#types/api_error'
import { ModelStatus } from '#types/model_status'
import loggerW from '#config/winston_logger'

const logout = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  try {
    await db.transaction(async (trx) => {
      currentDevice.accessToken = generateToken(currentUser.id)
      currentDevice.refreshToken = generateToken(currentUser.id)
      currentDevice.status = ModelStatus.Disabled
      currentDevice.useTransaction(trx)
      await currentDevice.save()
    })
  } catch (error) {
    loggerW.error(error)
    throw ApiError.newError('ERROR_INTERNAL_SERVER', 'SCL-1')
  }

  return response.ok({ result: true })
}

export default logout
