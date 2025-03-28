import vine from '@vinejs/vine'

export const addTrackValidator = vine.compile(
  vine.object({
    versusId: vine.string(),
    spotifyTrackId: vine.string().nullable(),
  })
)

export const addPendingTrackValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
    track: vine.object({
      trackId: vine.string(),
      spotifyTrackId: vine.string(),
      trackName: vine.string(),
      artistName: vine.string(),
      album: vine.string(),
      cover: vine.string(),
      url: vine.string(),
    }),
  })
)
