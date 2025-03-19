import vine from '@vinejs/vine'

export const setAndGetPlaylistSelectedValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
  })
)
