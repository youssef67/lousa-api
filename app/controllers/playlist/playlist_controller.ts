import type { HttpContext } from '@adonisjs/core/http'
const { default: getPlaylist } = await import('./playlist_controller.getPlaylist.js')
const { default: addPendingTrack } = await import('./playlist_controller.addPendingTrack.js')
const { default: getPlaylistSelected } = await import(
  './playlist_controller.getPlaylistSelected.js'
)
const { default: getTracksVersus } = await import('./playlist_controller.getTracksVersus.js')
const { default: searchTrack } = await import('./playlist_controller.searchTrack.js')
const { default: likeTrack } = await import('./playlist_controller.likeTrack.js')
const { default: setGoldenLike } = await import('./playlist_controller.setGoldenLike.js')
const { default: specialLikeTrack } = await import('./playlist_controller.specialLikeTrack.js')
const { default: getPlaylistUpdatedForStreamer } = await import(
  './playlist_controller.getPlaylistUpdatedForStreamer.js'
)

export default class PlaylistController {
  async getPlaylist(context: HttpContext) {
    return await getPlaylist(context)
  }

  async addPendingTrack(context: HttpContext) {
    return await addPendingTrack(context)
  }

  async searchTrack(context: HttpContext) {
    return await searchTrack(context)
  }

  async likeTrack(context: HttpContext) {
    return await likeTrack(context)
  }

  async specialLikeTrack(context: HttpContext) {
    return await specialLikeTrack(context)
  }

  async getTracksVersus(context: HttpContext) {
    return await getTracksVersus(context)
  }

  async getPlaylistSelected(context: HttpContext) {
    return await getPlaylistSelected(context)
  }

  async getPlaylistUpdatedForStreamer(context: HttpContext) {
    return await getPlaylistUpdatedForStreamer(context)
  }

  async setGoldenLike(context: HttpContext) {
    return await setGoldenLike(context)
  }
}
