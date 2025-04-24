import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import PlaylistService from '#services/playlist_service'

const getPlaylistForStreamer = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')

  await currentDevice.load('user', (queryUser) => {
    queryUser.preload('twitchUser', (queryTwitchUser) => {
      queryTwitchUser.preload('spaceStreamer', (querySpaceStreamer) => {
        querySpaceStreamer.preload('playlists')
      })
    })
  })
  const currentUser = currentDevice.user

  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PUGP-1')
  }

  const playlistsTracks = await PlaylistService.getRankedPlaylistTracksFormatted(
    playlist.playlistTracks
  )

  const currentPlaylist = {
    id: playlist.id,
    playlistName: playlist.playlistName,
    spaceStreamerId: currentUser.twitchUser.spaceStreamer.id,
    spaceStreamerName: currentUser.twitchUser.spaceStreamer.nameSpace,
    spaceStreamerImg: currentUser.twitchUser.spaceStreamer.spaceStreamerImg,
  }

  await db.transaction(async (trx) => {
    currentUser.twitchUser.spaceStreamer.lastPlaylistIdSelected = playlist.id
    currentUser.twitchUser.spaceStreamer.useTransaction(trx)
    await currentUser.twitchUser.spaceStreamer.save()
  })

  const otherPlaylists = await Promise.all(
    currentUser.twitchUser.spaceStreamer.playlists.map(async (item) => {
      await item.load('playlistTracks', (q) => q.where('isRanked', true))

      const nbFollowers = await db
        .from('favorite_playlists_users')
        .where('playlist_id', item.id)
        .count('*')

      return {
        id: item.id,
        playlistName: item.playlistName,
        nbTracks: item.playlistTracks.length,
        isSelected: item.id === currentUser.twitchUser.spaceStreamer.lastPlaylistIdSelected,
        nbFollowers: Number.parseInt(nbFollowers[0].count),
      }
    })
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
    otherPlaylists,
  })
}

export default getPlaylistForStreamer
