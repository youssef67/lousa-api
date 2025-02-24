import type { HttpContext } from '@adonisjs/core/http'
const { default: addFavoritePlaylist } = await import('./viewer_controller.addFavoritePlaylist.js')
const { default: deleteFavoritePlaylist } = await import(
  './viewer_controller.deleteFavoritePlaylist.js'
)
const { default: deleteFavoriteStreamer } = await import(
  './viewer_controller.deleteFavoriteStreamer.js'
)
const { default: addFavoriteStreamer } = await import('./viewer_controller.addFavoriteStreamer.js')
const { default: getViewerData } = await import('./viewer_controller.getViewerData.js')
const { default: setAndGetPlaylistSelected } = await import(
  './viewer_controller.setAndGetPlaylistSelected.js'
)

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

  async getViewerData(context: HttpContext) {
    return await getViewerData(context)
  }

  async setAndGetPlaylistSelected(context: HttpContext) {
    return await setAndGetPlaylistSelected(context)
  }
}
