import factory from '@adonisjs/lucid/factories'
import SpotifyUser from '#models/spotify_user'

export const SpotifyUserFactory = factory
  .define(SpotifyUser, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
    }
  })
  .build()
