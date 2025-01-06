import vine from '@vinejs/vine'
import { deviceValidator } from './common.js'

export const signupAnonymousValidator = vine.compile(
  vine.object({
    device: deviceValidator,
  })
)

export const signupEmailValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    device: deviceValidator,
    date: vine.string(),
  })
)

export const signupEmailConfirmValidator = vine.compile(
  vine.object({
    authId: vine.string().uuid({ version: [4] }),
    date: vine.string(),
    code: vine.string(),
  })
)

export const loginEmailValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    device: deviceValidator,
    date: vine.string(),
  })
)

export const loginEmailConfirmValidator = vine.compile(
  vine.object({
    authId: vine.string().uuid({ version: [4] }),
    date: vine.string(),
    code: vine.string(),
  })
)
