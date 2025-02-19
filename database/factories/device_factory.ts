import factory from '@adonisjs/lucid/factories'
import Device from '#models/device'

export const DeviceFactory = factory
  .define(Device, async ({ faker }) => {
    return {
      userId: faker.string.uuid(),
    }
  })
  .build()
