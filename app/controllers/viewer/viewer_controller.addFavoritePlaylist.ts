import type { HttpContext } from '@adonisjs/core/http'
import { addFavoritePlaylistValidator } from '#validators/viewer'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'

const addFavoritePlaylist = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addFavoritePlaylistValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlistExisting = Playlist.query().where('id', payload.playlistId).first()

  if (!playlistExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCFP-1')
  }

  await currentUser.related('favoritesPlaylists').attach([payload.playlistId])

  return response.ok({ result: true })
}

export default addFavoritePlaylist
