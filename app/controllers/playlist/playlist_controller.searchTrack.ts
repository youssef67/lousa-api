import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import axios from 'axios'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import SpotifyUser from '#models/spotify_user'

const searchTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const trackName = request.input('trackName')
  const playlistId = request.input('playlistId')

  await currentDevice.load('user')

  const playlist = await Playlist.query()
    .where('id', playlistId)
    .preload('spaceStreamer', (spaceStreamer) => {
      spaceStreamer.preload('twitchUser')
      spaceStreamer.preload('spotifyUser')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCST-1')
  }

  const spotifyUser = await SpotifyUser.findBy('id', playlist.spaceStreamer.spotifyUser.id)

  if (!spotifyUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCST-2')
  }

  if (spotifyUser.isAccessTokenExpired()) {
    const newAccessToken = await spotifyUser.refreshAccessToken()

    await db.transaction(async (trx) => {
      spotifyUser.accessToken = newAccessToken.access_token
      spotifyUser.tokenExpiresAt = DateTime.now().plus({ seconds: newAccessToken.expires_in })
      spotifyUser.scope = newAccessToken.scope
      spotifyUser.useTransaction(trx)
      await spotifyUser.save()
    })
  }

  try {
    const searchTrackRequest = await axios.get(`https://api.spotify.com/v1/search`, {
      params: {
        q: `track:"${trackName}"`,
        type: 'track',
        limit: 10,
      },
      headers: {
        Authorization: `Bearer ${spotifyUser.accessToken}`,
      },
    })

    const foundTracks = searchTrackRequest.data.tracks.items.map((track: any) => ({
      spotifyTrackId: track.id,
      trackName: track.name,
      artistName: track.artists.map((artist: any) => artist.name).join(', '),
      album: track.album.name,
      cover: track.album.images[0]?.url,
      url: track.external_urls.spotify,
    }))

    return response.ok({ foundTracks: foundTracks })
  } catch (error) {
    console.error('Erreur API Spotify:', error.response?.data || error.message)
    throw ApiError.newError('ERROR_SPOTIFY_API', 'VCST-3')
  }
}

export default searchTrack
