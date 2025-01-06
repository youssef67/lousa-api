/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth/auth_controller')
const SessionController = () => import('#controllers/session/session_controller')
const SpotifyController = () => import('#controllers/spotify/spotify_controller')
const TwitchController = () => import('#controllers/twitch/twitch_controller')

router
  .group(() => {
    router
      .group(() => {
        router.group(() => {
          router.post('signup/anonymous', [AuthController, 'signupAnonymous'])
        })

        router
          .group(() => {
            router.post('signup/email', [AuthController, 'signupEmail'])
            router.post('signup/email/confirm', [AuthController, 'signupEmailConfirm'])
            router.post('login/email', [AuthController, 'loginEmail'])
            router.post('login/email/confirm', [AuthController, 'loginEmailConfirm'])
            router.get('login/spotify/streamer', [AuthController, 'loginSpotifyStreamer'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('auth')

    router
      .group(() => {
        router
          .group(() => {
            router.post('logout', [SessionController, 'logout'])
            router.get('user', [SessionController, 'getUserSession'])
            router.put('user', [SessionController, 'editUser'])
            router.post('user/delete', [SessionController, 'deleteUser'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('session')

    router
      .group(() => {
        router.get('spotify/callback', [AuthController, 'handleSpotifyCallback'])
        router.get('twitch/callback', [TwitchController, 'handleTwitchCallback'])
      })
      .prefix('auth')

    router
      .group(() => {
        router
          .group(() => {
            router.post('playlist', [SpotifyController, 'createPlaylist'])
            router.get('playlists', [SpotifyController, 'getAllPlaylists'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('spotify')

    router
      .group(() => {
        router
          .group(() => {
            router.get('login/twitch/user', [AuthController, 'loginSpotifyStreamer'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('twitch')
  })
  .prefix('v1')
