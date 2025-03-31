import vine from '@vinejs/vine'

export const addTrackValidator = vine.compile(
  vine.object({
    versusId: vine.string(),
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

export const likeTrackValidator = vine.compile(
  vine.object({
    tracksVersusId: vine.string(),
    trackId: vine.string(),
    targetTrack: vine.number(),
  })
)

export const SpecialLikeTrackValidator = vine.compile(
  vine.object({
    tracksVersusId: vine.string(),
    targetTrack: vine.number(),
    amount: vine.number(),
  })
)
