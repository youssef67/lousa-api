import type { HttpContext } from '@adonisjs/core/http'
import { signupEmailValidator } from '#validators/auth'
import { UserRole } from '#types/user_role'
import ApiError from '#types/api_error'
import User from '#models/user'
import UserAuthEmail from '#models/user_auth_email'
import { UserAuthEmailState } from '#types/user_auth_email_state'
import { cryptoRandomString } from '#utils/random.utils'
import { sendEmail } from '#utils/email.utils'
import { AuthSignupEmailResponse } from '#interfaces/auth_interface'

const signupEmail = async ({ request, response, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(signupEmailValidator)
  await currentDevice.load('user')

  const currentUser = currentDevice.user

  if (currentUser.role !== UserRole.Anonymous) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACSE-1')
  }

  const existingUser = await User.query().where('email', payload.email).first()
  if (existingUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACSE-2')
  }

  const lastAuthEmail = await UserAuthEmail.query()
    .where('userId', currentUser.id)
    .orderBy('createdAt', 'desc')
    .first()

  if (lastAuthEmail) {
    if (lastAuthEmail.isCreatedAtLessThan30seconds()) {
      throw ApiError.newError('ERROR_AUTH_EMAIL_PLEASE_WAIT', 'ACSE-3')
    }

    await lastAuthEmail.merge({ state: UserAuthEmailState.Cancelled }).save()
  }

  const device = payload.device
  const verificationCode = cryptoRandomString({ length: 5, type: 'numeric' })

  const userAuthEmail = new UserAuthEmail().merge({
    userId: currentUser.id,
    deviceId: currentDevice.id,
    email: payload.email,
    date: payload.date,
    attempt: 0,
    state: UserAuthEmailState.Open,
    failure: '',
    code1: verificationCode,
    locale: device.locale,
    timezone: device.timezone,
    model: device.model,
    os: device.os,
    osVersion: device.osVersion,
    appVersion: device.appVersion,
    lastIp: request.ip(),
    type: 'signup',
  })
  await userAuthEmail.save()

  await sendEmail({
    pathEmailTemplate: 'emails/confirm_verification_code',
    toEmail: payload.email,
    fromEmail: 'contact@youssefmoudni.fr',
    subject: 'code de vérification',
    values: { verificationCode },
  })

  const responseJson: AuthSignupEmailResponse = {
    authId: userAuthEmail.id,
  }

  return response.ok(responseJson)
}

export default signupEmail
