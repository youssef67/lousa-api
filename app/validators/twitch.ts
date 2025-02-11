import vine from '@vinejs/vine'

export const addStreamerValidator = vine.compile(
  vine.object({
    nameStreamer: vine.string(),
  })
)
