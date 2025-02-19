import factory from '@adonisjs/lucid/factories'
import TwitchStream from '#models/twitch_stream'

export const TwitchStreamFactory = factory
  .define(TwitchStream, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
    }
  })
  .build()
