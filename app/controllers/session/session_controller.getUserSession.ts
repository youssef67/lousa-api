import { SessionGetUserSessionResponse } from '#interfaces/session_interface'
import type { HttpContext } from '@adonisjs/core/http'
import SpotifyUser from '#models/spotify_user'

const getUserSession = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const existingSpotifyUser = await SpotifyUser.query().where('userId', currentUser.id).first()

  const responseJson: SessionGetUserSessionResponse = {
    user: currentUser.serializeAsSession(),
    spotifyUser: existingSpotifyUser ? existingSpotifyUser.serializeAsSession() : undefined,
  }

  return response.ok(responseJson)
}

export default getUserSession
