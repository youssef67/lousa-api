import type { HttpContext } from '@adonisjs/core/http'
import { addTrackValidator } from '#validators/viewer'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import { TrackStatus } from '#types/track_status'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlist = await Playlist.find(payload.playlistId)

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-1')
  }

  const trackExisting = await Track.findBy('spotify_track_id', payload.track.id)

  let track: Track = new Track()
  if (!trackExisting) {
    await db.transaction(async (trx) => {
      track.spotifyTrackId = payload.track.id!
      track.trackName = payload.track.name!
      track.artistName = payload.track.artists!
      track.album = payload.track.album!
      track.cover = payload.track.cover!
      track.url = payload.track.url!
      track.submittedBy = currentUser.id
      track.useTransaction(trx)
      await track.save()
    })
  } else {
    track = trackExisting
  }

  const playlistTrackExisting = await PlaylistTrack.query()
    .where('playlist_id', playlist.id)
    .andWhere('track_id', track.id)
    .first()

  if (playlistTrackExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-2')
  }

  const playlistTrack = new PlaylistTrack()
  await db.transaction(async (trx) => {
    playlistTrack.playlistId = playlist.id
    playlistTrack.trackId = track.id
    playlistTrack.vote = 0
    playlistTrack.position = 0
    playlistTrack.status = TrackStatus.Active
    playlistTrack.useTransaction(trx)
    await playlistTrack.save()
  })

  await playlist.load('playlistTracks')

  const newPlaylistTrack = { ...track.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
  return response.ok({ newPlaylistTrack: newPlaylistTrack })
}

export default addTrack
