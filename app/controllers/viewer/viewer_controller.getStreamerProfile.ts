import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import SpaceStreamer from '#models/space_streamer'
import db from '@adonisjs/lucid/services/db'
import Playlist from '#models/playlist'

const getStreamerProfile = async ({ response, request, currentDevice }: HttpContext) => {
  const spaceStreamerId = request.input('spaceStreamerId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const spaceStreamer = await SpaceStreamer.query()
    .where('id', spaceStreamerId)
    .preload('playlists')
    .first()

  if (!spaceStreamer) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCGSP-1')
  }

  // Check if the streamer is favorite
  const isFavoriteStreamer = await db
    .query()
    .from('favorite_streamers_users')
    .where({
      space_streamer_id: spaceStreamerId,
      user_id: currentUser.id,
    })
    .first()

  const favoritesPlaylists = await db
    .query()
    .from('favorite_playlists_users')
    .where('user_id', currentUser.id)
  const favoritesPlaylistsIds = favoritesPlaylists.map((playlist) => playlist.playlist_id)

  const playlists = spaceStreamer.playlists.map((playlist) => ({
    ...playlist.serializePlaylist(),
    isFavorite: favoritesPlaylistsIds.includes(playlist.id), // Correction ici
  }))

  return response.ok({
    spaceStreamerProfile: {
      ...spaceStreamer.serializeAsSession(),
    },
    playlists,
    isFavoriteStreamer: !!isFavoriteStreamer,
  })
}

export default getStreamerProfile
