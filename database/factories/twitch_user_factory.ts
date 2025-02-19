import factory from '@adonisjs/lucid/factories'
import TwitchUser from '#models/twitch_user'

export const TwitchUserFactory = factory
  .define(TwitchUser, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
    }
  })
  .build()
