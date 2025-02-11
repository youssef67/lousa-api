import { TwitchDriver } from 'Twitch-driver'

declare module 'Twitch-driver' {
  interface TwitchDriver {
    userId: string | undefined
    setUserId(userId: string): void
  }
}
