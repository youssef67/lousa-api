import type { HttpContext } from '@adonisjs/core/http'
import { loginEmailValidator } from '#validators/auth'
import { UserRole } from '#types/user_role'
import ApiError from '#types/api_error'
import User from '#models/user'
import UserAuthEmail from '#models/user_auth_email'
import { UserAuthEmailState } from '#types/user_auth_email_state'
import { cryptoRandomString } from '#utils/random.utils'
import { sendEmail } from '#utils/email.utils'
import { AuthLoginEmailResponse } from '#interfaces/auth_interface'
import env from '#start/env'

const loginEmail = async ({ request, response, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(loginEmailValidator)
  await currentDevice.load('user')

  const currentUser = currentDevice.user
  if (currentUser.role !== UserRole.Anonymous) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACLE-1')
  }

  const existingUser = await User.query().where('email', payload.email).first()
  if (!existingUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACLE-2')
  }

  const lastAuthEmail = await UserAuthEmail.query()
    .where('userId', existingUser.id)
    .orderBy('createdAt', 'desc')
    .first()
  if (lastAuthEmail) {
    if (lastAuthEmail.isCreatedAtLessThan30seconds()) {
      throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACLE-3')
    }

    await lastAuthEmail.merge({ state: UserAuthEmailState.Cancelled }).save()
  }

  const userAuthEmail = new UserAuthEmail()
  const verificationCode = cryptoRandomString({ length: 5, type: 'numeric' })

  userAuthEmail.merge({
    userId: currentUser.id,
    deviceId: currentDevice.id,
    email: payload.email,
    date: 'XXXX',
    attempt: 0,
    state: UserAuthEmailState.Open,
    failure: '',
    code1: verificationCode,
    locale: payload.device.locale,
    timezone: payload.device.timezone,
    model: payload.device.model,
    os: payload.device.os,
    osVersion: payload.device.osVersion,
    appVersion: payload.device.appVersion,
    lastIp: request.ip(),
    type: 'login',
  })
  await userAuthEmail.save()

  if (env.get('API_ENV') === 'production') {
    await sendEmail({
      pathEmailTemplate: 'emails/confirm_verification_code',
      toEmail: payload.email,
      fromEmail: 'contact@youssefmoudni.fr',
      subject: 'code de vérification',
      values: { verificationCode },
    })
  }

  const responseJson: AuthLoginEmailResponse = {
    authId: userAuthEmail.id,
  }

  return response.ok(responseJson)
}

export default loginEmail
