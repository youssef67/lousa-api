import type { HttpContext } from '@adonisjs/core/http'
import { deleteFavoritePlaylistValidator } from '#validators/viewer'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'

const deleteFavoriteStreamer = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(deleteFavoritePlaylistValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlistExisting = Playlist.query().where('id', payload.playlistId).first()

  if (!playlistExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCDFP-1')
  }

  await currentUser.related('favoritesPlaylists').detach([payload.playlistId])

  return response.ok({ result: true })
}

export default deleteFavoriteStreamer
