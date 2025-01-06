import type { HttpContext } from '@adonisjs/core/http'
const { default: handleTwitchCallback } = await import(
  './twitch_controller.handleTwitchCallBack.js'
)

export default class TwitchController {
  async handleTwitchCallback(context: HttpContext) {
    return await handleTwitchCallback(context)
  }
}
