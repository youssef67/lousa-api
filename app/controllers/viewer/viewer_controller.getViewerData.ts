import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'
import Playlist from '#models/playlist'

const getViewerData = async ({ response, request, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const viewer = await User.query()
    .where('id', currentUser.id)
    .preload('favoritesPlaylists')
    .preload('favoritesSpaceStreamers')
    .first()

  if (!viewer) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCGV-1')
  }

  const playlistSelected = await Playlist.findBy('id', currentUser.playlistSelected)

  let isPlaylistSelected = null
  if (playlistSelected) {
    await playlistSelected.load('spaceStreamer')

    isPlaylistSelected = {
      id: playlistSelected.id,
      playlistName: playlistSelected.playlistName,
      spaceStreamerName: playlistSelected.spaceStreamer.nameSpace,
      spaceStreamerImg: playlistSelected.spaceStreamer.spaceStreamerImg,
    }
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
      await playlist.load('playlistTracks')

      return {
        id: playlist.id,
        playlistName: playlist.playlistName,
        spaceStreamerName: playlist.spaceStreamer.nameSpace,
        spaceStreamerImg: playlist.spaceStreamer.spaceStreamerImg,
        nbTracks: playlist.playlistTracks.length,
      }
    })
  )

  return response.ok({
    data: {
      isPlaylistSelected,
      spaceStreamersFavorites,
      playlistsFavorites,
    },
  })
}

export default getViewerData
