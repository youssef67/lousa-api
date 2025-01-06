import vine from '@vinejs/vine'

export const deviceValidator = vine.object({
  locale: vine.string().minLength(2),
  language: vine.string().minLength(2),
  timezone: vine.string().minLength(2),
  model: vine.string(),
  os: vine.string(),
  osVersion: vine.string(),
  appVersion: vine.string(),
  pushToken: vine.string().optional(),
})
