import { HttpContext } from '@adonisjs/core/http'
import { editUserValidator } from '#validators/session'
import { SessionEditUserResponse } from '#interfaces/session_interface'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import ApiError from '#types/api_error'
import loggerW from '#config/winston_logger'
import { DateTime } from 'luxon'

const editUser = async ({ request, response, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(editUserValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const userToUpdate = await User.findBy('email', currentUser.email)
  if (!userToUpdate) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCEU-1')
  }

  let dateOfBirth: DateTime | null = null
  if (payload.UserData.dateOfBirth) {
    dateOfBirth = DateTime.fromISO(payload.UserData.dateOfBirth)

    if (!dateOfBirth.isValid) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SCEU-2')
    }
  }

  try {
    await db.transaction(async (trx) => {
      currentUser.firstName = payload.UserData.firstName ?? currentUser.firstName
      currentUser.lastName = payload.UserData.lastName ?? currentUser.lastName
      currentUser.dateOfBirth = dateOfBirth
        ? DateTime.fromJSDate(dateOfBirth.toJSDate())
        : userToUpdate.dateOfBirth
      currentUser.useTransaction(trx)
      await currentUser.save()
    })
  } catch (error) {
    loggerW.error(error)
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCEU-3')
  }

  const responseJson: SessionEditUserResponse = {
    user: currentUser.serializeAsSession(),
  }

  return response.ok(responseJson)
}

export default editUser
