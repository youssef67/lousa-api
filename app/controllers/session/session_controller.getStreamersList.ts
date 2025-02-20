import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import SpaceStreamer from '#models/space_streamer'

const getStreamersList = async ({ response, request }: HttpContext) => {
  const page = request.input('page', 1)
  const perPage = 15

  const paginatedStreams = await SpaceStreamer.query().paginate(page, perPage)

  if (!paginatedStreams) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-2')
  }

  const serializedSpaceStreamers = paginatedStreams.serialize()

  return response.ok({ data: serializedSpaceStreamers })
}

export default getStreamersList
