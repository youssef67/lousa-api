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

export const completeProfileValidator = vine.compile(
  vine.object({
    userName: vine.string(),
  })
)

export const addTrackValidator = vine.compile(
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

// id: string
//   spotifyTrackId: string
//   trackId: string
//   trackName: string
//   artistName: string
//   album: string
//   cover: string
//   url: string
//   position: number
//   votes: number
//   score: number
//   user: UserSession
