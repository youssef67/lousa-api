import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import SpotifyUser from '#models/spotify_user'
import ApiError from '#types/api_error'
import { createPlaylistValidator } from '#validators/spotify'
import Playlist from '#models/playlist'
import { ModelStatus } from '#types/model_status'
import User from '#models/user'

const createPlaylist = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(createPlaylistValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  console.log('payload', payload)
  const existingSpotifyUser = await SpotifyUser.findBy('userId', currentUser.id)

  if (!existingSpotifyUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCGP-1')
  }

  if (existingSpotifyUser.isAccessTokenExpired()) {
    const newAccessToken = await existingSpotifyUser.refreshAccessToken()

    // TODO Future improvements n°1
    await db.transaction(async (trx) => {
      existingSpotifyUser.accessToken = newAccessToken.access_token
      existingSpotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({
        seconds: newAccessToken.expires_in,
      })
      existingSpotifyUser.scope = newAccessToken.scope
      existingSpotifyUser.useTransaction(trx)
      await existingSpotifyUser.save()
    })
  }

  const createPlaylistOnSpotifyRequest = await axios.post(
    `https://api.spotify.com/v1/users/${existingSpotifyUser.spotifyId}/playlists`,
    {
      name: payload.playlistName,
    },
    {
      headers: {
        'Authorization': `Bearer ${existingSpotifyUser.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const responseSpotify = createPlaylistOnSpotifyRequest.data

  const spaceStreamer = await User.query()
    .preload('twitchUser', (twitchUserQuery) => {
      twitchUserQuery.preload('spaceStreamer')
    })
    .where('id', currentUser.id)
    .firstOrFail()

  const newPlaylist = new Playlist()
  await db.transaction(async (trx) => {
    newPlaylist.playlistName = responseSpotify.name
    newPlaylist.spotifyPlaylistId = responseSpotify.id
    newPlaylist.spotifySnapShotId = responseSpotify.snapshot_id
    newPlaylist.spaceStreamerId = spaceStreamer.twitchUser.spaceStreamerId
    newPlaylist.onlyFollowers = payload.onlyFollowers
    newPlaylist.maxRankedTracks = payload.maxRankedTracks
    newPlaylist.status = ModelStatus.Enabled
    newPlaylist.useTransaction(trx)
    await newPlaylist.save()
  })

  const playlistCreated = {
    id: newPlaylist.id,
    playlistName: newPlaylist.playlistName,
    onlyFollowers: newPlaylist.onlyFollowers,
    maxRankedTracks: newPlaylist.maxRankedTracks,
    nbTracks: 0,
    isSelected: false,
    nbFollowers: 0,
  }

  return response.ok({
    playlistCreated,
  })
}

export default createPlaylist
