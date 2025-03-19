import type { HttpContext } from '@adonisjs/core/http'
const { default: logout } = await import('./session_controller.logout.js')
const { default: getUserSession } = await import('./session_controller.getUserSession.js')
const { default: editUser } = await import('./session_controller.editUser.js')
const { default: deleteUser } = await import('./session_controller.deleteUser.js')
const { default: getStreamersList } = await import('./session_controller.getStreamersList.js')

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

  async getStreamersList(context: HttpContext) {
    return await getStreamersList(context)
  }
}
