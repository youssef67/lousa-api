import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

const getFavorites = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const viewer = await User.query()
    .where('id', currentUser.id)
    .preload('favoritesPlaylists')
    .preload('favoritesSpaceStreamers')
    .first()

  if (!viewer) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCGF-1')
  }

  const spaceStreamersFavorites = await Promise.all(
    viewer.favoritesSpaceStreamers.map(async (spaceStreamer) => {
      await spaceStreamer.load('playlists')
      return {
        id: spaceStreamer.id,
        spaceStreamerName: spaceStreamer.nameSpace,
        spaceStreamerImg: spaceStreamer.spaceStreamerImg,
        nbPlaylists: spaceStreamer.playlists.length,
      }
    })
  )

  const playlistsFavorites = await Promise.all(
    viewer.favoritesPlaylists.map(async (playlist) => {
      await playlist.load('spaceStreamer')
      await playlist.load('playlistTracks', (q) => q.where('isRanked', true))

      const nbFollowers = await db
        .from('favorite_playlists_users')
        .where('playlist_id', playlist.id)
        .count('*')

      return {
        id: playlist.id,
        playlistName: playlist.playlistName,
        spaceStreamerName: playlist.spaceStreamer.nameSpace,
        spaceStreamerImg: playlist.spaceStreamer.spaceStreamerImg,
        nbTracks: playlist.playlistTracks.length,
        isSelected: playlist.id === currentUser.playlistSelected,
        nbFollowers: Number.parseInt(nbFollowers[0].count),
      }
    })
  )

  return response.ok({
    spaceStreamersFavorites,
    playlistsFavorites,
  })
}

export default getFavorites
