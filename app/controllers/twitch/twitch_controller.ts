import type { HttpContext } from '@adonisjs/core/http'
const { default: loginTwitch } = await import('./twitch_controller.loginTwitch.js')
const { default: callbackTwitch } = await import('./twitch_controller.callbackTwitch.js')
const { default: updateStreamersList } = await import('./twitch_controller.updateStreamersList.js')
const { default: addStreamer } = await import('./twitch_controller.addStreamer.js')

export default class TwitchController {
  async loginTwitch(context: HttpContext) {
    return await loginTwitch(context)
  }

  async callbackTwitch(context: HttpContext) {
    return await callbackTwitch(context)
  }

  async updateStreamersList(context: HttpContext) {
    return await updateStreamersList(context)
  }

  async addStreamer(context: HttpContext) {
    return await addStreamer(context)
  }
}
