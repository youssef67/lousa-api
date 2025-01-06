import type { HttpContext } from '@adonisjs/core/http'
const { default: signupAnonymous } = await import('./auth_controller.signupAnonymous.js')
const { default: signupEmail } = await import('./auth_controller.signupEmail.js')
const { default: signupEmailConfirm } = await import('./auth_controller.signupEmailConfirm.js')
const { default: loginEmail } = await import('./auth_controller.loginEmail.js')
const { default: loginEmailConfirm } = await import('./auth_controller.loginEmailConfirm.js')
const { default: loginSpotifyStreamer } = await import('./auth_controller.loginSpotifyStreamer.js')
const { default: handleSpotifyCallback } = await import(
  './auth_controller.handleSpotifyCallback.js'
)

export default class AuthController {
  async signupAnonymous(context: HttpContext) {
    return await signupAnonymous(context)
  }

  async signupEmail(context: HttpContext) {
    return await signupEmail(context)
  }

  async signupEmailConfirm(context: HttpContext) {
    return await signupEmailConfirm(context)
  }

  async loginEmail(context: HttpContext) {
    return await loginEmail(context)
  }

  async loginEmailConfirm(context: HttpContext) {
    return await loginEmailConfirm(context)
  }

  async loginSpotifyStreamer(context: HttpContext) {
    return await loginSpotifyStreamer(context)
  }

  async handleSpotifyCallback(context: HttpContext) {
    return await handleSpotifyCallback(context)
  }
}
