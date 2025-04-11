import type { HttpContext } from '@adonisjs/core/http'
const { default: addTrack } = await import('./playlist_controller.addTrack.js')
const { default: addPendingTrack } = await import('./playlist_controller.addPendingTrack.js')
const { default: getPlaylistTracks } = await import('./playlist_controller.getPlaylistTracks.js')
const { default: getTracksVersus } = await import('./playlist_controller.getTracksVersus.js')
const { default: searchTrack } = await import('./playlist_controller.searchTrack.js')
const { default: likeTrack } = await import('./playlist_controller.likeTrack.js')
const { default: specialLikeTrack } = await import('./playlist_controller.specialLikeTrack.js')

export default class PlaylistController {
  async addTrack(context: HttpContext) {
    return await addTrack(context)
  }

  async addPendingTrack(context: HttpContext) {
    return await addPendingTrack(context)
  }

  async getPlaylistTracks(context: HttpContext) {
    return await getPlaylistTracks(context)
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
}
