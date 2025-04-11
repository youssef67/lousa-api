import type { HttpContext } from '@adonisjs/core/http'
import { addPendingTrackValidator } from '#validators/playlist'
import transmit from '@adonisjs/transmit/services/main'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import Track from '#models/track'
import TrackService from '#services/track_service'
import VersusService from '#services/versus_service'
import JobsService from '#services/jobs_service'
import { sanitizeTracksVersus } from '#utils/sanitize_broadcast'
import TracksVersus from '#models/tracks_versus'

const addPendingTrack = async ({ request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addPendingTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  console.log('pending controller')

  const playlist = await Playlist.query()
    .where('id', payload.playlistId)
    .preload('playlistTracks', (playlistTracksQuery) => {
      playlistTracksQuery.preload('track')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCAPT-1')
  }

  for (const playlistTrack of playlist!.playlistTracks) {
    if (playlistTrack.track.spotifyTrackId === payload.track.spotifyTrackId) {
      console.log('track already exists')
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCAPT-2')
    }
  }

  // Add track spotify data to the database
  let track: Track
  let newTracksVersus: TracksVersus = {} as TracksVersus
  await db.transaction(async (trx) => {
    track = await TrackService.addTrack(payload.track, trx)
    newTracksVersus = await VersusService.createOrUpdateTracksVersus(
      track,
      playlist.id,
      currentUser.id,
      trx
    )

    await newTracksVersus.load('firstTrack')
    await newTracksVersus.load('secondTrack')
    await newTracksVersus.load('likeTracks')

    if (newTracksVersus.closingDate) {
      await JobsService.setRegisterWinnerJob(newTracksVersus.id, trx)
    }
  })

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(newTracksVersus, null)

  console.log('currentTracksVersus', currentTracksVersus)
  transmit.broadcast(`playlist/tracksVersus/${newTracksVersus.playlistId}`, {
    currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
  })
}

export default addPendingTrack
