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
const StreamerController = () => import('#controllers/streamer/streamer_controller')
const PlaylistController = () => import('#controllers/playlist/playlist_controller')

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
            router.post('login/spotify', [AuthController, 'loginSpotify'])
            router.post('login/twitch', [AuthController, 'loginTwitch'])
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
            router.get('streamers', [SessionController, 'getStreamersList'])
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
            router.post('profile', [ViewerController, 'completeProfile'])
            router.get('profile', [ViewerController, 'checkUserNameAvailability'])
            router.get('streamer', [ViewerController, 'getStreamerProfile'])
            router.get('stats', [ViewerController, 'statistics'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('viewer')

    router
      .group(() => {
        router
          .group(() => {
            router.post('profile/validation', [StreamerController, 'checkIfStreamer'])
            router.post('profile/delete', [StreamerController, 'deleteStreamerProfile'])
            router.get('playlist/selected', [StreamerController, 'getPlaylistSelected'])
            router.get('', [StreamerController, 'getStreamerProfile'])
            router.post('playlist', [StreamerController, 'createPlaylist'])
            router.delete('playlist', [StreamerController, 'deletePlaylist'])
            router.post('add', [StreamerController, 'addStreamer'])
            router.post('list/update', [StreamerController, 'updateStreamersList'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('streamer')

    router
      .group(() => {
        router
          .group(() => {
            router.get('track/search', [PlaylistController, 'searchTrack'])
            router.get('track/add', [PlaylistController, 'addTrack'])
            router.post('pending/track/add', [PlaylistController, 'addPendingTrack'])
            router.post('track/like', [PlaylistController, 'likeTrack'])
            router.post('track/special/like', [PlaylistController, 'specialLikeTrack'])
            router.post('golden-like', [PlaylistController, 'setGoldenLike'])
            router.get('', [PlaylistController, 'getPlaylistTracks'])
            router.get('tracksVersus', [PlaylistController, 'getTracksVersus'])
            router.get('selected', [PlaylistController, 'getPlaylistSelected'])
            router.get('updated/streamer', [PlaylistController, 'getPlaylistUpdatedForStreamer'])
          })
          .use(middleware.authApiToken())
      })
      .use(middleware.authApiKey())
      .prefix('playlist')
    // Authentication API
    router
      .group(() => {
        router.get('twitch/callback', [AuthController, 'handleTwitchCallback'])
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
