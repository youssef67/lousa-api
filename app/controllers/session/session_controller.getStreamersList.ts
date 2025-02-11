import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import TwitchStream from '#models/twitch_stream'

const getStreamersList = async ({ response, request }: HttpContext) => {
  // await currentDevice.load('user')
  // const currentUser = currentDevice.user

  // const existingTwitchUser = await TwitchUser.findBy('user_id', currentUser.id)
  // if (!existingTwitchUser) {
  //   throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-1')
  // }
  console.log('getStreamersList')

  const page = request.input('page', 1)
  const perPage = 15

  const paginatedStreams = await TwitchStream.query().paginate(page, perPage)

  if (!paginatedStreams) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-2')
  }

  console.log('streamers length:', paginatedStreams.length)
  const serializedStreamers = paginatedStreams.serialize()

  console.log('serializedStreamers:', serializedStreamers)
  return response.ok({ data: serializedStreamers })
}

export default getStreamersList
