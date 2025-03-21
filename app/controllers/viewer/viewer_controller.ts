import type { HttpContext } from '@adonisjs/core/http'
const { default: addFavoritePlaylist } = await import('./viewer_controller.addFavoritePlaylist.js')
const { default: deleteFavoritePlaylist } = await import(
  './viewer_controller.deleteFavoritePlaylist.js'
)
const { default: deleteFavoriteStreamer } = await import(
  './viewer_controller.deleteFavoriteStreamer.js'
)
const { default: addFavoriteStreamer } = await import('./viewer_controller.addFavoriteStreamer.js')
const { default: setAndGetPlaylistSelected } = await import(
  './viewer_controller.setAndGetPlaylistSelected.js'
)
const { default: searchTrack } = await import('./viewer_controller.searchTrack.js')
const { default: addTrack } = await import('./viewer_controller.addTrack.js')
const { default: getPlaylistTracks } = await import('./viewer_controller.getPlaylistTracks.js')
const { default: completeProfile } = await import('./viewer_controller.completeProfile.js')
const { default: checkUserNameAvailability } = await import(
  './viewer_controller.checkUserNameAvailability.js'
)
const { default: getFavorites } = await import('./viewer_controller.getFavorites.js')
const { default: getStreamerProfile } = await import('./viewer_controller.getStreamerProfile.js')

export default class ViewerController {
  async addFavoritePlaylist(context: HttpContext) {
    return await addFavoritePlaylist(context)
  }

  async deleteFavoritePlaylist(context: HttpContext) {
    return await deleteFavoritePlaylist(context)
  }

  async deleteFavoriteStreamer(context: HttpContext) {
    return await deleteFavoriteStreamer(context)
  }

  async addFavoriteStreamer(context: HttpContext) {
    return await addFavoriteStreamer(context)
  }

  async setAndGetPlaylistSelected(context: HttpContext) {
    return await setAndGetPlaylistSelected(context)
  }

  async searchTrack(context: HttpContext) {
    return await searchTrack(context)
  }

  async addTrack(context: HttpContext) {
    return await addTrack(context)
  }

  async getPlaylistTracks(context: HttpContext) {
    return await getPlaylistTracks(context)
  }

  async completeProfile(context: HttpContext) {
    return await completeProfile(context)
  }

  async checkUserNameAvailability(context: HttpContext) {
    return await checkUserNameAvailability(context)
  }

  async getFavorites(context: HttpContext) {
    return await getFavorites(context)
  }

  async getStreamerProfile(context: HttpContext) {
    return await getStreamerProfile(context)
  }
}
