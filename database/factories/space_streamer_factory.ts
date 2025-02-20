import factory from '@adonisjs/lucid/factories'
import SpaceStream from '#models/space_streamer'

export const SpaceStreamFactory = factory
  .define(SpaceStream, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
    }
  })
  .build()
