import type { HttpContext } from '@adonisjs/core/http'
const { default: addFavoritePlaylist } = await import('./viewer_controller.addFavoritePlaylist.js')
const { default: deleteFavoritePlaylist } = await import(
  './viewer_controller.deleteFavoritePlaylist.js'
)
const { default: deleteFavoriteStreamer } = await import(
  './viewer_controller.deleteFavoriteStreamer.js'
)
const { default: addFavoriteStreamer } = await import('./viewer_controller.addFavoriteStreamer.js')
const { default: completeProfile } = await import('./viewer_controller.completeProfile.js')
const { default: checkUserNameAvailability } = await import(
  './viewer_controller.checkUserNameAvailability.js'
)
const { default: getFavorites } = await import('./viewer_controller.getFavorites.js')
const { default: getStreamerProfile } = await import('./viewer_controller.getStreamerProfile.js')
const { default: statistics } = await import('./viewer_controller.statistics.js')

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

  async statistics(context: HttpContext) {
    return await statistics(context)
  }
}
