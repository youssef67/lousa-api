import factory from '@adonisjs/lucid/factories'
import User from '#models/user'
import { ModelStatus } from '#types/model_status'
import { UserRole } from '#types/user_role'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: UserRole.User,
      status: ModelStatus.Enabled,
    }
  })
  .build()
