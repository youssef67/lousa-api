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
