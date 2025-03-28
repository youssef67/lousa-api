import type { HttpContext } from '@adonisjs/core/http'
import { addPendingTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import Track from '#models/track'
import TrackService from '#services/track_service'
import VersusService from '#services/versus_service'

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
  if (trackExisting) {
    track = trackExisting
  }

  await db.transaction(async (trx) => {
    if (!trackExisting) {
      track = await TrackService.addTrack(payload.track, trx)
    }

    const versus = await VersusService.setActionVersus(track, playlist.id, trx)
  })

  return response.ok({ result: true })
}

export default addPendingTrack
