import { SessionGetUserSessionResponse } from '#interfaces/session_interface'
import type { HttpContext } from '@adonisjs/core/http'

const getUserSession = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  await currentUser.loadForSerializationAsSession()

  const responseJson: SessionGetUserSessionResponse = {
    user: currentUser.serializeAsSession(),
  }

  return response.ok(responseJson)
}

export default getUserSession
