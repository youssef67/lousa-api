/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth/auth_controller')
const SessionController = () => import('#controllers/session/session_controller')
const ViewerController = () => import('#controllers/viewer/viewer_controller')
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
            router.get('validate/streamer/profile', [SessionController, 'checkIfStreamer'])
            router.post('streamer/space', [SessionController, 'getSpaceStreamerData'])
            router.get('streamers', [SessionController, 'getStreamersList'])
            router.post('streamer/profile/delete', [SessionController, 'deleteStreamerProfile'])
            router.post('playlist/selected', [SessionController, 'setAndGetPlaylistSelected'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('session')

    router
      .group(() => {
        router
          .group(() => {
            router.post('favorite/playlist/add', [ViewerController, 'addFavoritePlaylist'])
            router.post('favorite/playlist/delete', [ViewerController, 'deleteFavoritePlaylist'])
            router.post('favorite/streamer/add', [ViewerController, 'addFavoriteStreamer'])
            router.post('favorite/streamer/delete', [ViewerController, 'deleteFavoriteStreamer'])
            router.get('favorites', [ViewerController, 'getFavorites'])
            router.get('playlist/select', [ViewerController, 'setAndGetPlaylistSelected'])
            router.get('track/search', [ViewerController, 'searchTrack'])
            router.post('track/add', [ViewerController, 'addTrack'])
            router.get('playlist', [ViewerController, 'getPlaylistTracks'])
            router.post('profile', [ViewerController, 'completeProfile'])
            router.get('profile', [ViewerController, 'checkUserNameAvailability'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('viewer')

    router
      .group(() => {
        router
          .group(() => {
            router.post('playlist', [SpotifyController, 'createPlaylist'])
            router.post('playlist/delete', [SpotifyController, 'deletePlaylist'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('spotify')

    // TWITCH
    router
      .group(() => {
        router
          .group(() => {
            router.get('login', [TwitchController, 'loginTwitch'])
            router.get('update/list/streamers', [TwitchController, 'updateStreamersList'])
            router.post('streamer', [TwitchController, 'addStreamer'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('twitch')

    // Authentication API
    router
      .group(() => {
        router.get('twitch/callback', [TwitchController, 'callbackTwitch'])
        router.get('spotify/callback', [AuthController, 'handleSpotifyCallback'])
      })
      .prefix('auth')

    transmit.registerRoutes((route) => {
      if (route.getPattern() === '__transmit/events') {
        route.middleware([])
      }
    })
  })
  .prefix('v1')
