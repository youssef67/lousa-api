import vine from '@vinejs/vine'

export const createPlaylistValidator = vine.compile(
  vine.object({
    playlistName: vine.string(),
    onlyFollowers: vine.boolean(),
    maxRankedTracks: vine.number(),
  })
)

export const deletePlaylistValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
  })
)
