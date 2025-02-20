import factory from '@adonisjs/lucid/factories'
import Playlist from '#models/playlist'

export const PlaylistFactory = factory
  .define(Playlist, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
    }
  })
  .build()
