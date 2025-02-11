import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import TwitchStream from '#models/twitch_stream'

const setAndGetPlaylistSelected = async ({ response, request, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // const existingTwitchUser = await TwitchUser.findBy('user_id', currentUser.id)
  // if (!existingTwitchUser) {
  //   throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-1')
  // }

  return response.ok({ result: true })
}

export default setAndGetPlaylistSelected
