import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
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

    await db.transaction(async (trx) => {
      const spotifyUser = new SpotifyUser()
      spotifyUser.userId = currentUser.id
      spotifyUser.spotifyId = getProfile.data.id
      spotifyUser.displayName = getProfile.data.display_name
      spotifyUser.emailSpotify = getProfile.data.email
      spotifyUser.externalUrl = getProfile.data.external_urls.spotify
      spotifyUser.nbFollowers = getProfile.data.followers.total
      spotifyUser.accessToken = tokenResponse.data.access_token
      spotifyUser.refreshToken = tokenResponse.data.refresh_token
      spotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({ seconds: 3600 })
      spotifyUser.scope = tokenResponse.data.scope
      spotifyUser.useTransaction(trx)
      await spotifyUser.save()

      currentUser.spotifyUserId = spotifyUser.id
      currentUser.useTransaction(trx)
      await currentUser.save()
      return spotifyUser
    })

    return response.send(`
      <html>
        <body>
          <p>Authentification réussie. Vous pouvez maintenant fermer cette fenêtre.</p>
          <button onclick="closeWindow()">Fermer la fenêtre</button>

          <script>
            // Notifier la fenêtre parent de la réussite
            if (window.opener) {
              window.opener.postMessage({
                type: 'SPOTIFY_AUTH_SUCCESS',
                profile: ${JSON.stringify(getProfile.data).replace(/</g, '\\u003c')}
              }, '*');
            }

            // Fonction pour fermer la fenêtre
            function closeWindow() {
              window.close();
            }
          </script>
        </body>
      </html>
    `)
  } catch (error) {
    return response.send(`
      <html>
        <body>
          <p>Erreur lors de l'authentification. Vous pouvez fermer cette fenêtre.</p>
          <button onclick="closeWindow()">Fermer la fenêtre</button>

          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'SPOTIFY_AUTH_ERROR',
                error: '${error.message}'
              }, '*');
            }

            // Fonction pour fermer la fenêtre
            function closeWindow() {
              window.close();
            }
          </script>
        </body>
      </html>
    `)
  }
}

export default handleSpotifyCallback
