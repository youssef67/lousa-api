import type { HttpContext } from '@adonisjs/core/http'
const { default: addTrack } = await import('./playlist_controller.addTrack.js')
const { default: addPendingTrack } = await import('./playlist_controller.addPendingTrack.js')
const { default: getPlaylistTracks } = await import('./playlist_controller.getPlaylistTracks.js')
const { default: searchTrack } = await import('./playlist_controller.searchTrack.js')
const { default: refreshVersus } = await import('./playlist_controller.refreshVersus.js')

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

  async refreshVersus(context: HttpContext) {
    return await refreshVersus(context)
  }
}
