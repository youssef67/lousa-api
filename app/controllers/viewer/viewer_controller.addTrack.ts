import type { HttpContext } from '@adonisjs/core/http'
import { addTrackValidator } from '#validators/viewer'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import axios from 'axios'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import { TrackStatus } from '#types/track_status'
import { DateTime } from 'luxon'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addTrackValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlist = await Playlist.find(payload.playlistId)

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-1')
  }

  await playlist.load('spaceStreamer', (spaceStreamerQuery) => {
    spaceStreamerQuery.preload('spotifyUser')
  })

  const spotifyUser = playlist.spaceStreamer.spotifyUser

  if (spotifyUser.isAccessTokenExpired()) {
    const newAccessToken = await spotifyUser.refreshAccessToken()

    await db.transaction(async (trx) => {
      spotifyUser.accessToken = newAccessToken.access_token
      spotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({
        seconds: newAccessToken.expires_in,
      })
      spotifyUser.scope = newAccessToken.scope
      spotifyUser.useTransaction(trx)
      await spotifyUser.save()
    })
  }

  const trackExisting = await Track.findBy('spotify_track_id', payload.track.id)

  // Add track spotify data to the database
  let track: Track
  if (!trackExisting) {
    track = new Track()
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

  // Check if the track is already in the playlist
  const playlistTrackExisting = await PlaylistTrack.query()
    .where('playlist_id', playlist.id)
    .andWhere('track_id', track.id)
    .first()

  if (playlistTrackExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-2')
  }

  // Add track to the playlist on Spotify
  const addTrackRequest = await axios.post(
    `https://api.spotify.com/v1/playlists/${playlist.spotifyPlaylistId}/tracks`,
    {
      uris: [`spotify:track:${track.spotifyTrackId}`],
      snapshot_id: playlist.spotifySnapShotId,
    },
    {
      headers: {
        'Authorization': `Bearer ${spotifyUser.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (addTrackRequest.status !== 201) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-2')
  }

  // Add track to the playlist in the database
  const playlistTrack = new PlaylistTrack()
  await db.transaction(async (trx) => {
    playlistTrack.playlistId = playlist.id
    playlistTrack.trackId = track.id
    playlistTrack.userId = currentUser.id
    playlistTrack.vote = 0
    playlistTrack.position = 0
    playlistTrack.status = TrackStatus.Active
    playlistTrack.useTransaction(trx)
    await playlistTrack.save()
  })

  // Update the playlist snapshot id
  await Playlist.query().where('id', playlist.id).update({
    spotifySnapShotId: addTrackRequest.data.snapshot_id,
  })

  await playlist.load('playlistTracks')
  await playlistTrack.load('user')

  const newPlaylistTrack = { ...track.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
  return response.ok({ newPlaylistTrack: newPlaylistTrack })
}

export default addTrack
