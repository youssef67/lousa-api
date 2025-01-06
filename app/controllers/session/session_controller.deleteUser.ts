import type { HttpContext } from '@adonisjs/core/http'
import { generateToken } from '#utils/authentication.utils'
import db from '@adonisjs/lucid/services/db'
import ApiError from '#types/api_error'
import Device from '#models/device'
import { randomUUID } from 'node:crypto'
import loggerW from '#config/winston_logger'
import { ModelStatus } from '#types/model_status'

const deleteUser = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const devicesOfUser = await Device.query()
    .where('userId', currentUser.id)
    .andWhere('status', ModelStatus.Enabled)

  try {
    await db.transaction(async (trx) => {
      for (const device of devicesOfUser) {
        device.accessToken = generateToken(currentUser.id)
        device.refreshToken = generateToken(currentUser.id)
        device.status = ModelStatus.Deleted
        device.useTransaction(trx)
        await device.save()
      }

      currentUser.email = `DELETED_${randomUUID()}@lousa.one`
      currentUser.firstName = 'DELETED'
      currentUser.lastName = 'DELETED'
      currentUser.dateOfBirth = null
      currentUser.status = ModelStatus.Deleted
      currentUser.useTransaction(trx)
      await currentUser.save()
    })
  } catch (error) {
    loggerW.error(error)
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCDU-1')
  }

  return response.ok({ result: true })
}

export default deleteUser
