import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'

const getPlaylistTracks = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')

  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.preload('user')
    })
    .preload('spaceStreamer')
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-1')
  }

  // await playlist.load('playlistTracks')
  // await playlist.load('spaceStreamer')

  const playlistsTracks = await Promise.all(
    playlist.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-2')
      }

      return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
    })
  )

  const playlistSelected = {
    id: playlist.id,
    playlistName: playlist.playlistName,
    spaceStreamerName: playlist.spaceStreamer.nameSpace,
    spaceStreamerImg: playlist.spaceStreamer.spaceStreamerImg,
  }

  return response.ok({ playlistsTracks: playlistsTracks, playlistSelected })
}

export default getPlaylistTracks
