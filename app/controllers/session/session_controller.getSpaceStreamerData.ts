import SpaceStreamer from '#models/space_streamer'
import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import { getSpaceStreamerDataValidator } from '#validators/session'
import User from '#models/user'

const getSpaceStreamerData = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(getSpaceStreamerDataValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const user = await User.find(currentUser.id)

  if (!user) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-1')
  }

  const playlistsFavoritesOfUser = await user.related('favoritesPlaylists').query()
  const favoritePlaylistIds = new Set(playlistsFavoritesOfUser.map((playlist) => playlist.id))

  let id: string | undefined

  if ('spaceStreamerId' in payload && payload.spaceStreamerId) {
    const query = await SpaceStreamer.find(payload.spaceStreamerId)
    if (!query) throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-2')
    id = query.twitchUserId
  }

  if ('twitchUserId' in payload && payload.twitchUserId) {
    id = payload.twitchUserId
  }

  if (!id) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-3')
  }

  const spaceStreamer = await SpaceStreamer.findBy('twitchUserId', id)

  if (!spaceStreamer) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-4')
  }

  await spaceStreamer.load('playlists')

  const playlists = spaceStreamer.playlists.map((playlist) => ({
    ...playlist.serializePlaylist(),
    isFavorite: favoritePlaylistIds.has(playlist.id),
  }))

  console.log(playlists)

  return response.ok({ spaceStreamer: spaceStreamer.serializeAsSession(), playlists })
}

export default getSpaceStreamerData
