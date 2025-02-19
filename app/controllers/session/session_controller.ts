import type { HttpContext } from '@adonisjs/core/http'
const { default: logout } = await import('./session_controller.logout.js')
const { default: getUserSession } = await import('./session_controller.getUserSession.js')
const { default: editUser } = await import('./session_controller.editUser.js')
const { default: deleteUser } = await import('./session_controller.deleteUser.js')
const { default: checkIfStreamer } = await import('./session_controller.checkIfStreamer.js')
const { default: getStreamersList } = await import('./session_controller.getStreamersList.js')
const { default: getSpaceStreamerData } = await import(
  './session_controller.getSpaceStreamerData.js'
)
const { default: deleteStreamerProfile } = await import(
  './session_controller.deleteStreamerProfile.js'
)
const { default: setAndGetPlaylistSelected } = await import(
  './session_controller.setAndGetPlaylistSelected.js'
)

export default class SessionController {
  async logout(context: HttpContext) {
    return await logout(context)
  }

  async getUserSession(context: HttpContext) {
    return await getUserSession(context)
  }

  async editUser(context: HttpContext) {
    return await editUser(context)
  }

  async deleteUser(context: HttpContext) {
    return await deleteUser(context)
  }

  async checkIfStreamer(context: HttpContext) {
    return await checkIfStreamer(context)
  }

  async getStreamersList(context: HttpContext) {
    return await getStreamersList(context)
  }

  async deleteStreamerProfile(context: HttpContext) {
    return await deleteStreamerProfile(context)
  }

  async setAndGetPlaylistSelected(context: HttpContext) {
    return await setAndGetPlaylistSelected(context)
  }

  async getSpaceStreamerData(context: HttpContext) {
    return await getSpaceStreamerData(context)
  }
}
