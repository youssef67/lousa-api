import vine from '@vinejs/vine'

export const addTrackValidator = vine.compile(
  vine.object({
    versusId: vine.string(),
    winnerTrack: vine.object({
      trackId: vine.string(),
      score: vine.number(),
      userId: vine.string(),
      spotifyTrackId: vine.string(),
    }),
  })
)

export const addPendingTrackValidator = vine.compile(
  vine.object({
    playlistId: vine.string(),
    score: vine.number().optional(),
    track: vine.object({
      trackId: vine.string().optional(),
      spotifyTrackId: vine.string().optional(),
      trackName: vine.string(),
      artistName: vine.string(),
      album: vine.string(),
      cover: vine.string(),
      url: vine.string(),
    }),
  })
)
