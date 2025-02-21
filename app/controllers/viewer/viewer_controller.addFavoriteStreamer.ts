import type { HttpContext } from '@adonisjs/core/http'
import { addFavoriteStreamerValidator } from '#validators/viewer'
import ApiError from '#types/api_error'
import SpaceStreamer from '#models/space_streamer'

const addFavoriteStreamer = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addFavoriteStreamerValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const spaceStreamerExisting = SpaceStreamer.query().where('id', payload.spaceStreamerId).first()

  if (!spaceStreamerExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAFS-1')
  }

  await currentUser.related('favoritesSpaceStreamers').attach([payload.spaceStreamerId])

  return response.ok({ result: true })
}

export default addFavoriteStreamer
