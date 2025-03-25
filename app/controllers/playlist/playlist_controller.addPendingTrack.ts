import type { HttpContext } from '@adonisjs/core/http'
import { addPendingTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import Track from '#models/track'
import { TrackStatus } from '#types/track_status'
import PlaylistPendingTrack from '#models/playlist_pending_track'

const addPendingTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addPendingTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlist = await Playlist.findBy('id', payload.playlistId)

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-1')
  }

  const trackExisting = await Track.findBy('spotify_track_id', payload.track.spotifyTrackId)

  //Add track spotify data to the database
  let track: Track
  if (!trackExisting) {
    track = new Track()
    await db.transaction(async (trx) => {
      track.spotifyTrackId = payload.track.spotifyTrackId!
      track.trackName = payload.track.trackName!
      track.artistName = payload.track.artistName!
      track.album = payload.track.album!
      track.cover = payload.track.cover!
      track.url = payload.track.url!
      track.useTransaction(trx)
      await track.save()
    })
  } else {
    track = trackExisting
  }

  const pendingTrack = new PlaylistPendingTrack()
  await db.transaction(async (trx) => {
    pendingTrack.userId = currentUser.id
    pendingTrack.playlistId = playlist.id
    pendingTrack.trackId = track.id
    pendingTrack.status = TrackStatus.OnHold
    pendingTrack.useTransaction(trx)
    await pendingTrack.save()
  })

  return response.ok({ result: true })
}

export default addPendingTrack
