import vine from '@vinejs/vine'

export const addFavoritePlaylistValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
  })
)

export const deleteFavoritePlaylistValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
  })
)
