import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import { deletePlaylistValidator } from '#validators/spotify'
import Playlist from '#models/playlist'

const deletePlaylist = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(deletePlaylistValidator)
  await currentDevice.load('user')

  console.log('payload', payload)
  try {
    const playlist = await Playlist.findBy('id', payload.playlistId)

    if (!playlist) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SCDP-1')
    }

    await playlist.delete()

    return response.ok({
      result: true,
    })
  } catch (error) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCDP-2')
  }
}

export default deletePlaylist
