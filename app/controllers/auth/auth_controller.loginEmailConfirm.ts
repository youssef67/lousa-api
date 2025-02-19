import type { HttpContext } from '@adonisjs/core/http'
import { loginEmailConfirmValidator } from '#validators/auth'
import { UserRole } from '#types/user_role'
import ApiError from '#types/api_error'
import UserAuthEmail from '#models/user_auth_email'
import Device from '#models/device'
import { AuthLoginEmailConfirmResponse } from '#interfaces/auth_interface'
import { UserAuthEmailState } from '#types/user_auth_email_state'
import db from '@adonisjs/lucid/services/db'
import { generateToken } from '#utils/authentication.utils'
import User from '#models/user'
import { DateTime } from 'luxon'
import { ModelStatus } from '#types/model_status'
import env from '#start/env'
import { UserAuthEmailType } from '#types/user_auth_email_type'
import { sign } from 'cookie-signature'
import TwitchUser from '#models/twitch_user'

const loginEmailConfirm = async ({ request, response, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(loginEmailConfirmValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  if (currentUser.role !== UserRole.Anonymous) {
    // Only anonymous user can login
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACLC-1')
  }

  const authEmail = await UserAuthEmail.find(payload.authId)

  if (!authEmail) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLC-2')
  }

  const userToLogin = await User.findBy('email', authEmail.email)

  if (!userToLogin) {
    throw ApiError.newError('ERROR_AUTH_USER_NOT_FOUND', 'ACLC-3')
  }

  if (userToLogin.status !== ModelStatus.Enabled) {
    throw ApiError.newError('ERROR_AUTH_USER_DISABLED', 'ACLC-4')
  }

  if (authEmail.isCreatedAtMoreThan5Minutes()) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLC-5')
  }

  if (authEmail.type !== UserAuthEmailType.LOGIN) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLC-6')
  }

  if (authEmail) {
    if ([UserAuthEmailState.Cancelled, UserAuthEmailState.Success].includes(authEmail.state)) {
      throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLC-7')
    }
  }

  if (
    authEmail.state === UserAuthEmailState.Failure &&
    authEmail.attempt >= env.get('AUTH_EMAIL_MAX_ATTEMPTS')
  ) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLC-8')
  }

  const code = payload.code
  const newDevice = new Device()

  if (authEmail?.code1 !== code) {
    const debugCode = env.get('API_DEBUG_VERIFICATION_CODE')
    let needErrorCode = true
    // ATTENTION ! MANIPULATE THIS PART OF CODE CAREFULLY
    // needErrorCode SHOULD ALWAYS BE TRUE in Production !!!
    if (env.get('API_ENV') === 'production') {
      needErrorCode = true
    } else if (debugCode && debugCode === code) {
      needErrorCode = false
    } else {
      needErrorCode = true
    }

    if (needErrorCode) {
      authEmail.merge({
        attempt: authEmail.attempt + 1,
        state: UserAuthEmailState.Failure,
        failure: `${authEmail.failure}${code},`,
      })
      await authEmail.save()

      throw ApiError.newError('ERROR_AUTH_EMAIL_CONFIRM_INVALID_CODE', 'ACLC-9')
    }
  }

  await db.transaction(async (transaction) => {
    authEmail.attempt = authEmail.attempt + 1
    authEmail.state = UserAuthEmailState.Success
    authEmail.useTransaction(transaction)
    await authEmail.save()

    const userId = authEmail.userId

    await Device.query({ client: transaction }).where('userId', userId).delete()
    newDevice.locale = authEmail.locale
    newDevice.language = currentDevice.language
    newDevice.timezone = authEmail.timezone
    newDevice.model = authEmail.model
    newDevice.os = authEmail.os
    newDevice.osVersion = authEmail.osVersion
    newDevice.appVersion = authEmail.appVersion
    newDevice.pushToken = currentDevice.pushToken
    newDevice.accessToken = generateToken(userToLogin.id)
    newDevice.refreshToken = generateToken(userToLogin.id)
    newDevice.userId = userToLogin.id
    newDevice.lastIp = request.ip()
    newDevice.lastConnectionAt = DateTime.fromJSDate(new Date())
    newDevice.useTransaction(transaction)
    await newDevice.save()
  })

  await userToLogin.loadForSerializationAsSession()

  const responseJson: AuthLoginEmailConfirmResponse = {
    rt: `s:${sign(newDevice.refreshToken, env.get('COOKIE_SECRET'))}`,
    at: `s:${sign(newDevice.accessToken, env.get('COOKIE_SECRET'))}`,
    di: `s:${sign(newDevice.id, env.get('COOKIE_SECRET'))}`,
    user: userToLogin.serializeAsSession(),
  }

  return response.ok(responseJson)
}

export default loginEmailConfirm
