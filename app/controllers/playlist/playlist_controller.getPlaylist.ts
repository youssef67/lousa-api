import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import Playlist from '#models/playlist'

const getPlaylist = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .preload('spaceStreamer')
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PUGP-1')
  }

  const playlistInfo = {
    id: playlist.id,
    playlistName: playlist.playlistName,
    spaceStreamerId: playlist.spaceStreamer.id,
    spaceStreamerName: playlist.spaceStreamer.nameSpace,
    spaceStreamerImg: playlist.spaceStreamer.spaceStreamerImg,
  }

  if (currentUser.playlistSelected !== playlist.id) {
    await db.transaction(async (trx) => {
      currentUser.playlistSelected = playlist.id
      currentUser.useTransaction(trx)
      await currentUser.save()
    })
  }

  const playlistsTracks = await Promise.all(
    playlist.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCGP-2')
      }

      return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
    })
  )

  let trackVersus: TracksVersus | null

  trackVersus = await TracksVersus.query()
    .where('playlist_id', playlist.id)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await TracksVersus.query()
      .where('playlist_id', playlist.id)
      .andWhere('status', TracksVersusStatus.MissingTracks)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  return response.ok({
    playlistsTracks: playlistsTracks,
    playlistInfo,
    currentTracksVersus,
    currentUser: currentUser.serializeAsSession(),
  })
}

export default getPlaylist
