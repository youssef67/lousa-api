import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import axios from 'axios'
import SpotifyUser from '#models/spotify_user'
import { DateTime } from 'luxon'
import { ModelStatus } from '#types/model_status'

const handleSpotifyCallback = async ({ request, response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user
  const code = request.qs().code

  if (!code) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACHS-1')
  }

  const existingSpotifyUser = await SpotifyUser.findBy('userId', currentUser.id)

  let spotifyUser
  if (existingSpotifyUser) spotifyUser = existingSpotifyUser
  else spotifyUser = new SpotifyUser()

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: env.get('SPOTIFY_REDIRECT_URI'),
    client_id: env.get('SPOTIFY_CLIENT_ID'),
    client_secret: env.get('SPOTIFY_CLIENT_SECRET'),
  })

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const getProfile = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    })

    await db.transaction(async (trx) => {
      spotifyUser.userId = currentUser.id
      spotifyUser.spotifyId = getProfile.data.id
      spotifyUser.accessToken = tokenResponse.data.access_token
      spotifyUser.refreshToken = tokenResponse.data.refresh_token
      spotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({ seconds: 3600 })
      spotifyUser.scope = tokenResponse.data.scope
      spotifyUser.status = ModelStatus.Enabled
      spotifyUser.useTransaction(trx)
      await spotifyUser.save()

      currentUser.spotifyUserId = spotifyUser.id
      currentUser.useTransaction(trx)
      await currentUser.save()
    })

    transmit.broadcast(`authentication/spotify/${spotifyUser.userId}`, {
      spotifyUser: JSON.stringify(spotifyUser.serializeAsSession()),
    })
  } catch (error) {
    return response.status(500).send(error)
  }
}

export default handleSpotifyCallback
