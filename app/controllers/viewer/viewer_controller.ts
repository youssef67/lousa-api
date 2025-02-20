import type { HttpContext } from '@adonisjs/core/http'
const { default: addFavoritePlaylist } = await import('./viewer_controller.addFavoritePlaylist.js')
const { default: deleteFavoritePlaylist } = await import(
  './viewer_controller.deleteFavoritePlaylist.js'
)

export default class ViewerController {
  async addFavoritePlaylist(context: HttpContext) {
    return await addFavoritePlaylist(context)
  }

  async deleteFavoritePlaylist(context: HttpContext) {
    return await deleteFavoritePlaylist(context)
  }
}
