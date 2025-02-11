import vine from '@vinejs/vine'

export const openBroadcastConfirmValidator = vine.compile(
  vine.object({
    channelName: vine.string(),
  })
)
