import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import Playlist from '#models/playlist'
import PlaylistService from '#services/playlist_service'

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

  const currentPlaylist = {
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

  const playlistsTracks = await PlaylistService.getRankedPlaylistTracksFormatted(
    playlist.playlistTracks
  )

  let trackVersus: TracksVersus | null

  trackVersus = await VersusService.getTracksVersusByPlaylistIdAndStatus(
    playlist.id,
    TracksVersusStatus.VotingProgress
  )

  if (!trackVersus) {
    trackVersus = await VersusService.getTracksVersusByPlaylistIdAndStatus(
      playlist.id,
      TracksVersusStatus.MissingTracks
    )
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  return response.ok({
    currentPlaylist,
    playlistsTracks,
    currentTracksVersus,
    currentUser: currentUser.serializeAsSession(),
  })
}

export default getPlaylist
