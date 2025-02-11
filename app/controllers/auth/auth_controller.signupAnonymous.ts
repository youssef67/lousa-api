import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { signupAnonymousValidator } from '#validators/auth'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import Device from '#models/device'
import { UserRole } from '#types/user_role'
import { generateToken } from '#utils/authentication.utils'
import { DateTime } from 'luxon'
import { AuthSignupAnonymousResponse } from '#interfaces/auth_interface'
import { sign } from 'cookie-signature'
import env from '#start/env'

const signupAnonymous = async ({ request, response }: HttpContext) => {
  const payload = await request.validateUsing(signupAnonymousValidator)
  const devicePayload = payload.device

  const userId = randomUUID()

  const anonymousUser = new User()
  const newDevice = new Device()

  await db.transaction(async (trx) => {
    anonymousUser.id = userId
    anonymousUser.email = `${userId}@lousa.com`
    anonymousUser.role = UserRole.Anonymous
    anonymousUser.useTransaction(trx)
    await anonymousUser.save()
    newDevice.merge(devicePayload)
    const accessToken = generateToken(userId)
    const refreshToken = generateToken(userId)
    newDevice.accessToken = accessToken
    newDevice.refreshToken = refreshToken
    newDevice.userId = userId
    newDevice.lastIp = request.ip()
    newDevice.lastConnectionAt = DateTime.fromJSDate(new Date())
    newDevice.useTransaction(trx)
    await newDevice.save()
  })

  const responseJson: AuthSignupAnonymousResponse = {
    rt: `s:${sign(newDevice.refreshToken, env.get('COOKIE_SECRET'))}`,
    at: `s:${sign(newDevice.accessToken, env.get('COOKIE_SECRET'))}`,
    di: `s:${sign(newDevice.id, env.get('COOKIE_SECRET'))}`,
    user: anonymousUser.serializeAsSession(),
  }

  const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2

  response.cookie('rt', `s:${sign(newDevice.refreshToken, env.get('COOKIE_SECRET'))}`, {
    httpOnly: true, // JS cannot access this cookie
    secure: false, // Only set if using HTTPS
    sameSite: 'strict', // Send cookie on same-site requests
    maxAge: TWO_YEARS_IN_SECONDS,
  })

  response.cookie('at', `s:${sign(newDevice.accessToken, env.get('COOKIE_SECRET'))}`, {
    httpOnly: true, // JS cannot access this cookie
    secure: false, // Only set if using HTTPS
    sameSite: 'strict', // Send cookie on same-site requests
    maxAge: TWO_YEARS_IN_SECONDS,
  })

  response.cookie('di', `s:${sign(newDevice.id, env.get('COOKIE_SECRET'))}`, {
    httpOnly: true, // JS cannot access this cookie
    secure: false, // Only set if using HTTPS
    sameSite: 'strict', // Send cookie on same-site requests
    maxAge: TWO_YEARS_IN_SECONDS,
  })

  return response.ok(responseJson)
}

export default signupAnonymous
