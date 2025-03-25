import type { HttpContext } from '@adonisjs/core/http'
import { addPendingTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import Track from '#models/track'
import { TrackStatus } from '#types/track_status'
import PlaylistPendingTrack from '#models/playlist_pending_track'

const refreshVersus = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  console.log('refreshVersus --- playlistId', playlistId)

  return response.ok({ result: true })
}

export default refreshVersus
