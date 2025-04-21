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
import { TracksVersusStatus } from '#types/versus.status'
import { PendingAddResult } from '#types/pending_status'

const addPendingTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addPendingTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

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
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCAPT-2')
    }
  }

  const nbVersusTracks = await TracksVersus.query()
    .where((query) => {
      query.where('first_track_user', currentUser.id).orWhere('second_track_user', currentUser.id)
    })
    .andWhere('status', '!=', TracksVersusStatus.CompletedVotes)

  if (nbVersusTracks.length >= 2) {
    return response.ok({ result: PendingAddResult.LIMIT_REACH })
  }

  // Add track spotify data to the database
  let track: Track
  let tracksVersusCreatedOrUpdated: TracksVersus = {} as TracksVersus
  await db.transaction(async (trx) => {
    track = await TrackService.addTrack(payload.track, trx)
    tracksVersusCreatedOrUpdated = await VersusService.createOrUpdateTracksVersus(
      track,
      playlist.id,
      currentUser.id,
      trx
    )

    if (tracksVersusCreatedOrUpdated.closingDate) {
      await JobsService.setRegisterWinnerJob(tracksVersusCreatedOrUpdated.id, trx)
    }
  })

  console.log('tracksVersusCreatedOrUpdated.status', tracksVersusCreatedOrUpdated.status)
  console.log(tracksVersusCreatedOrUpdated.status === TracksVersusStatus.MissingTracks)

  if (tracksVersusCreatedOrUpdated.status === TracksVersusStatus.VotingProgress) {
    const tracksVersus = await TracksVersus.query()
      .where('id', tracksVersusCreatedOrUpdated.id)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()

    const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
      tracksVersus,
      currentUser.id
    )

    transmit.broadcast(`playlist/tracksVersus/${tracksVersus?.playlistId}`, {
      currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
    })

    return response.ok({ result: PendingAddResult.VOTING })
  } else if (tracksVersusCreatedOrUpdated.status === TracksVersusStatus.MissingTracks) {
    const tracksVersusWithVotingProgressStatus = await TracksVersus.query()
      .where('playlist_id', playlist.id)
      .andWhere('status', TracksVersusStatus.VotingProgress)
      .first()

    if (!tracksVersusWithVotingProgressStatus) {
      const tracksVersus = await TracksVersus.query()
        .where('id', tracksVersusCreatedOrUpdated.id)
        .preload('firstTrack')
        .preload('secondTrack')
        .preload('likeTracks')
        .first()

      const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
        tracksVersus,
        currentUser.id
      )

      transmit.broadcast(`playlist/tracksVersus/${tracksVersus?.playlistId}`, {
        currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
      })
    }

    return response.ok({ result: PendingAddResult.MISSING })
  } else {
    return response.ok({ result: PendingAddResult.ON_HOLD })
  }
}

export default addPendingTrack
