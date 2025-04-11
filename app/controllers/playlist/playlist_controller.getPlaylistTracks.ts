import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'

const getPlaylistTracks = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // Get the playlist
  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .preload('spaceStreamer')
    // .preload('tracksVersus', (tracksVersusQuery) => {
    //   tracksVersusQuery.preload('firstTrack')
    //   tracksVersusQuery.preload('secondTrack')
    // })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGP-1')
  }
  // Update the user playlist selected
  await db.transaction(async (trx) => {
    currentUser.playlistSelected = playlist.id
    currentUser.useTransaction(trx)
    await currentUser.save()
  })

  // Get the tracks of the playlist
  const playlistsTracks = await Promise.all(
    playlist.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCGP-2')
      }

      return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
    })
  )

  const playlistInfo = {
    id: playlist.id,
    playlistName: playlist.playlistName,
    spaceStreamerId: playlist.spaceStreamer.id,
    spaceStreamerName: playlist.spaceStreamer.nameSpace,
    spaceStreamerImg: playlist.spaceStreamer.spaceStreamerImg,
  }

  return response.ok({
    playlistsTracks: playlistsTracks,
    playlistInfo,
  })
}

export default getPlaylistTracks
