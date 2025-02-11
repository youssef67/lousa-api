import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import axios from 'axios'
import SpotifyUser from '#models/spotify_user'
import { DateTime } from 'luxon'

const handleSpotifyCallback = async ({ request, response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user
  const code = request.qs().code

  if (!code) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACHS-1')
  }

  const existingSpotifyUser = await SpotifyUser.findBy('userId', currentUser.id)

  if (existingSpotifyUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACHS-2')
  }

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

    const newSpotifyUser = new SpotifyUser()
    await db.transaction(async (trx) => {
      newSpotifyUser.userId = currentUser.id
      newSpotifyUser.spotifyId = getProfile.data.id
      newSpotifyUser.displayName = getProfile.data.display_name
      newSpotifyUser.emailSpotify = getProfile.data.email
      newSpotifyUser.externalUrl = getProfile.data.external_urls.spotify
      newSpotifyUser.nbFollowers = getProfile.data.followers.total
      newSpotifyUser.accessToken = tokenResponse.data.access_token
      newSpotifyUser.refreshToken = tokenResponse.data.refresh_token
      newSpotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({ seconds: 3600 })
      newSpotifyUser.scope = tokenResponse.data.scope
      newSpotifyUser.useTransaction(trx)
      await newSpotifyUser.save()

      currentUser.spotifyUserId = newSpotifyUser.id
      currentUser.useTransaction(trx)
      await currentUser.save()
    })

    transmit.broadcast(`authentication/spotify/${newSpotifyUser.userId}`, {
      spotifyUser: JSON.stringify(newSpotifyUser.serializeAsSession()),
    })
  } catch (error) {
    return response.status(500).send(error)
  }
}

export default handleSpotifyCallback
