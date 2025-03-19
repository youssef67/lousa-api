import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'
import Playlist from '#models/playlist'

const getStreamerProfile = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const user = await User.query()
    .where('id', currentUser.id)
    .preload('twitchUser', (queryTwitchUser) => {
      queryTwitchUser.preload('spaceStreamer', (querySpaceStreamer) => {
        querySpaceStreamer.preload('playlists')
      })
    })
    .preload('favoritesPlaylists')
    .first()

  if (!user) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGP-1')
  }

  let playlistSelected = null
  if (user.twitchUser.spaceStreamer.lastPlaylistIdSelected) {
    playlistSelected = await Playlist.query()
      .where('id', user.twitchUser.spaceStreamer.lastPlaylistIdSelected)
      .preload('playlistTracks')
      .first()

    playlistSelected = {
      id: playlistSelected?.id,
      playlistName: playlistSelected?.playlistName,
      nbTracks: playlistSelected?.playlistTracks.length,
    }
  }

  const playlists = user.twitchUser.spaceStreamer.playlists.map((playlist) => ({
    ...playlist.serializePlaylist(),
  }))

  return response.ok({
    spaceStreamerProfile: {
      ...user.twitchUser.spaceStreamer.serializeAsSession(),
    },
    playlists,
    playlistSelected,
  })
}

export default getStreamerProfile
