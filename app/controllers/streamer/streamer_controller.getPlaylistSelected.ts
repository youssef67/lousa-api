import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'

const getPlaylistSelected = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const userExisting = await User.query()
    .where('id', currentUser.id)
    .preload('twitchUser', (queryTwitchUser) => {
      queryTwitchUser.preload('spaceStreamer')
    })
    .first()

  if (!userExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGPS-1')
  }

  return response.ok({
    spaceStreamerInfo: userExisting.twitchUser.spaceStreamer.serializeAsSession(),
  })
}

export default getPlaylistSelected
