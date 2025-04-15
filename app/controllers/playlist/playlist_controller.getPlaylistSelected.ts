import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'

const getPlaylistSelected = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const userExisting = await User.findBy('id', currentUser.id)

  if (!userExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGPS-1')
  }

  return response.ok({
    playlistId: userExisting.playlistSelected,
  })
}

export default getPlaylistSelected
