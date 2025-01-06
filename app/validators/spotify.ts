import vine from '@vinejs/vine'

export const createPlaylistValidator = vine.compile(
  vine.object({
    playlistName: vine.string(),
  })
)
