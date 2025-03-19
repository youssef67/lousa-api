import type { HttpContext } from '@adonisjs/core/http'
const { default: checkIfStreamer } = await import('./streamer_controller.checkIfStreamer.js')
const { default: deleteStreamerProfile } = await import('./streamer_controller.checkIfStreamer.js')
const { default: getStreamerProfile } = await import('./streamer_controller.getStreamerProfile.js')
const { default: setAndGetPlaylistSelected } = await import(
  './streamer_controller.setAndGetPlaylistSelected.js'
)
const { default: createPlaylist } = await import('./streamer_controller.createPlaylist.js')
const { default: deletePlaylist } = await import('./streamer_controller.deletePlaylist.js')
const { default: addStreamer } = await import('./streamer_controller.addStreamer.js')
const { default: updateStreamersList } = await import(
  './streamer_controller.updateStreamersList.js'
)

export default class SessionController {
  async checkIfStreamer(context: HttpContext) {
    return await checkIfStreamer(context)
  }

  async deleteStreamerProfile(context: HttpContext) {
    return await deleteStreamerProfile(context)
  }

  async getStreamerProfile(context: HttpContext) {
    return await getStreamerProfile(context)
  }

  async setAndGetPlaylistSelected(context: HttpContext) {
    return await setAndGetPlaylistSelected(context)
  }

  async createPlaylist(context: HttpContext) {
    return await createPlaylist(context)
  }

  async deletePlaylist(context: HttpContext) {
    return await deletePlaylist(context)
  }

  async addStreamer(context: HttpContext) {
    return await addStreamer(context)
  }

  async updateStreamersList(context: HttpContext) {
    return await updateStreamersList(context)
  }
}
