import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'
import { TwitchDriver, TwitchDriverService } from '#services/twitch_driver'

const allyConfig = defineConfig({
  twitch: TwitchDriverService({
    clientId: env.get('TWITCH_CLIENT_ID'),
    clientSecret: env.get('TWITCH_CLIENT_SECRET'),
    callbackUrl: env.get('TWITCH_REDIRECT_URI'),
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders {
    twitch: TwitchDriver
  }
}
