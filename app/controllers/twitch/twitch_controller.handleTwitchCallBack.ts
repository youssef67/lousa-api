import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import axios from 'axios'
import SpotifyUser from '#models/spotify_user'
import { DateTime } from 'luxon'

const handleTwitchCallback = async ({ request, response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  return response.ok({ result: true })
}

export default handleTwitchCallback
