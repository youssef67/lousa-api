import type { HttpContext } from '@adonisjs/core/http'
const { default: createPlaylist } = await import('./spotify_controller.createPlaylist.js')
const { default: deletePlaylist } = await import('./spotify_controller.deletePlaylist.js')

export default class SessionController {
  async createPlaylist(context: HttpContext) {
    return await createPlaylist(context)
  }

  async deletePlaylist(context: HttpContext) {
    return await deletePlaylist(context)
  }
}
