import SpaceStreamer from '#models/space_streamer'
import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'

const getSpaceStreamerData = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  if (!currentUser.twitchUserId) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-1')
  }

  const spaceStreamer = await SpaceStreamer.query()
    .where('twitchUserId', currentUser.twitchUserId)
    .first()

  if (!spaceStreamer) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGS-2')
  }

  await spaceStreamer.load('playlists')

  let playlists = []
  if (spaceStreamer.playlists.length > 0) {
    for (const playlist of spaceStreamer.playlists) {
      const playlistSerialized = playlist.serializePlaylist()
      playlists.push(playlistSerialized)
    }
  }

  return response.ok({ spaceStreamer: spaceStreamer.serializeAsSession(), playlists: playlists })
}

export default getSpaceStreamerData
