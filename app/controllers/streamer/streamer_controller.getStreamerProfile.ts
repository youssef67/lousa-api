import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import User from '#models/user'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import db from '@adonisjs/lucid/services/db'

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
    .first()

  if (!user) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGP-1')
  }

  let playlistsTracks = null
  let currentPlaylist = null
  if (user.twitchUser.spaceStreamer.lastPlaylistIdSelected) {
    const playlistSelected = await Playlist.query()
      .where('id', user.twitchUser.spaceStreamer.lastPlaylistIdSelected)
      .preload('playlistTracks', (playlistTrackQuery) => {
        playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
      })
      .first()

    if (!playlistSelected) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SCGP-2')
    }

    playlistsTracks = await Promise.all(
      playlistSelected.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
        const trackData = await Track.findBy('id', playlistTrack.trackId)

        if (!trackData) {
          throw ApiError.newError('ERROR_INVALID_DATA', 'SCGP-3')
        }

        return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
      })
    )

    currentPlaylist = {
      id: playlistSelected.id,
      playlistName: playlistSelected.playlistName,
    }
  }

  const otherPlaylists = await Promise.all(
    user.twitchUser.spaceStreamer.playlists.map(async (playlist) => {
      await playlist.load('playlistTracks', (q) => q.where('isRanked', true))

      const nbFollowers = await db
        .from('favorite_playlists_users')
        .where('playlist_id', playlist.id)
        .count('*')

      return {
        id: playlist.id,
        playlistName: playlist.playlistName,
        nbTracks: playlist.playlistTracks.length,
        isSelected: playlist.id === user.twitchUser.spaceStreamer.lastPlaylistIdSelected,
        nbFollowers: Number.parseInt(nbFollowers[0].count),
      }
    })
  )

  return response.ok({
    spaceStreamerProfile: {
      ...user.twitchUser.spaceStreamer.serializeAsSession(),
    },
    otherPlaylists,
    playlistsTracks,
    currentPlaylist,
  })
}

export default getStreamerProfile
