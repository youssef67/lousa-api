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

export const addFavoriteStreamerValidator = vine.compile(
  vine.object({
    spaceStreamerId: vine.string(),
  })
)

export const deleteFavoriteStreamerValidator = vine.compile(
  vine.object({
    spaceStreamerId: vine.string(),
  })
)

export const setAndGetPlaylistSelectedValidator = vine.compile(
  vine.object({
    playlistId: vine.string().nullable(),
  })
)
