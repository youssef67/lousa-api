import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import VersusService from '#services/versus_service'
import { BroadcasterVersus, ScoreAndLikes } from '#interfaces/playlist_interface'

const getPlaylistTracks = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  console.log('currentUser', currentUser)
  // Get the playlist
  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .preload('spaceStreamer')
    .preload('tracksVersus', (tracksVersusQuery) => {
      tracksVersusQuery.preload('firstTrack')
      tracksVersusQuery.preload('secondTrack')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCGT-1')
  }

  let nextTracksVersus: BroadcasterVersus | null = null
  let scoreAndLikes: ScoreAndLikes | null = null
  // Update the user playlist selected
  await db.transaction(async (trx) => {
    currentUser.playlistSelected = playlist.id
    currentUser.useTransaction(trx)
    await currentUser.save()

    const expiredVersus = await VersusService.getExpiredTracksVersusToProcess(playlist.id)

    if (expiredVersus.length > 0) {
      for (const versus of expiredVersus) {
        await VersusService.registerWinner(versus, trx)
      }
    }

    nextTracksVersus = await VersusService.getTracksVersusBroadcasted(
      playlist.id,
      currentUser.id,
      trx
    )

    if (nextTracksVersus) {
      scoreAndLikes = {
        firstTrackScore: nextTracksVersus.firstTrackScore,
        firstTrackAlreadyLiked: nextTracksVersus.firstTrack?.isLikedByUser || false,
        specialLikeFirstTrack: nextTracksVersus.specialLikeFirstTrack,
        secondTrackScore: nextTracksVersus.secondTrackScore,
        secondTrackAlreadyLiked: nextTracksVersus.secondTrack?.isLikedByUser || false,
        specialLikeSecondTrack: nextTracksVersus.specialLikeSecondTrack,
        nbLikesFirstTrack: nextTracksVersus.firstTrack?.nbLikes || 0,
        nbLikesSecondTrack: nextTracksVersus.secondTrack?.nbLikes || 0,
      }
    }
  })

  // Get the tracks of the playlist
  const playlistsTracks = await Promise.all(
    playlist.playlistTracks.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'VCGT-2')
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
    currentTracksVersus: nextTracksVersus,
    scoreAndLikes,
    user: currentUser.serializeAsSession(),
  })
}

export default getPlaylistTracks
