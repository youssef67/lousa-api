import vine from '@vinejs/vine'

export const editUserValidator = vine.compile(
  vine.object({
    UserData: vine.object({
      firstName: vine.string().minLength(1).maxLength(30).optional(),
      lastName: vine.string().minLength(1).maxLength(30).optional(),
      dateOfBirth: vine.string().optional(),
    }),
  })
)

export const setAndGetPlaylistSelectedValidator = vine.compile(
  vine.object({
    playlistId: vine.string().nullable(),
  })
)

export const getSpaceStreamerDataValidator = vine.compile(
  vine.object({
    spaceStreamerId: vine.string().optional(),
    twitchUserId: vine.string().optional(),
  })
)
