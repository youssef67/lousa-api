import type { HttpContext } from '@adonisjs/core/http'
import { signupEmailConfirmValidator } from '#validators/auth'
import ApiError from '#types/api_error'
import { AuthSignupEmailConfirmResponse } from '#interfaces/auth_interface'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { UserRole } from '#types/user_role'
import UserAuthEmail from '#models/user_auth_email'
import { UserAuthEmailState } from '#types/user_auth_email_state'

const signupEmailConfirm = async ({ request, response, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(signupEmailConfirmValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  if (currentUser.role !== UserRole.Anonymous) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACEC-1')
  }

  const authEmail = await UserAuthEmail.find(payload.authId)

  if (!authEmail) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACEC-2')
  }

  if (authEmail.isCreatedAtMoreThan5Minutes()) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACEC-3')
  }

  if (authEmail.type !== 'signup') {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACEC-4')
  }

  if ([UserAuthEmailState.Cancelled, UserAuthEmailState.Success].includes(authEmail.state)) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACEC-5')
  }

  if (
    authEmail.state === UserAuthEmailState.Failure &&
    authEmail.attempt >= env.get('AUTH_EMAIL_MAX_ATTEMPTS')
  ) {
    throw ApiError.newError('ERROR_EMAIL_CONFIRM_CODE_EXPIRED', 'ACEC-6')
  }

  const code = payload.code

  if (authEmail.code1 !== code) {
    const debugCode = env.get('API_DEBUG_VERIFICATION_CODE')
    let needErrorCode = true

    if (env.get('API_ENV') === 'production') {
      needErrorCode = true
    } else if (debugCode && debugCode === code) {
      needErrorCode = false
    } else {
      needErrorCode = true
    }

    if (needErrorCode) {
      await authEmail
        .merge({
          attempt: authEmail.attempt + 1,
          failure: 'ERROR_INVALID_DATA',
          state: UserAuthEmailState.Failure,
        })
        .save()
      throw ApiError.newError('ERROR_AUTH_EMAIL_CONFIRM_INVALID_CODE', 'ACEC-7')
    }
  }

  await db.transaction(async (trx) => {
    authEmail.attempt = authEmail.attempt + 1
    authEmail.state = UserAuthEmailState.Success
    authEmail.useTransaction(trx)
    await authEmail.save()

    currentUser.email = authEmail.email
    currentUser.role = UserRole.User
    currentUser.useTransaction(trx)
    await currentUser.save()
  })

  const responseJson: AuthSignupEmailConfirmResponse = {
    user: currentUser.serializeAsSession(),
  }

  return response.ok(responseJson)
}

export default signupEmailConfirm
