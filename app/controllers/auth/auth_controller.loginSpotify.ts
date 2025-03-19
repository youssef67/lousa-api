import type { HttpContext } from '@adonisjs/core/http'
import { ScopeSpotifyLogin } from '#types/spotify_scope'
import env from '#start/env'

const loginSpotify = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.get('SPOTIFY_CLIENT_ID'),
    scope: [
      ScopeSpotifyLogin.USER_READ_PRIVATE,
      ScopeSpotifyLogin.USER_READ_EMAIL,
      ScopeSpotifyLogin.PLAYLIST_MODIFY_PRIVATE,
      ScopeSpotifyLogin.PLAYLIST_MODIFY_PUBLIC,
    ].join(' '),
    redirect_uri: env.get('SPOTIFY_REDIRECT_URI'),
  })

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

  const responseJson = {
    urlAuthorize: spotifyAuthUrl,
  }

  return response.ok(responseJson)
}

export default loginSpotify
