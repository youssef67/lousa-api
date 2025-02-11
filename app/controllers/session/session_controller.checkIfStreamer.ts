import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'
import env from '#start/env'

const checkIfStreamer = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const existingTwitchUser = await TwitchUser.findBy('user_id', currentUser.id)

  if (!existingTwitchUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-1')
  }

  const accessToken = existingTwitchUser.accessToken
  const clientId = env.get('TWITCH_CLIENT_ID')

  const params: any = {
    id: existingTwitchUser.twitchId,
  }

  const twitchResponse = await axios.get('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-ID': clientId,
    },
    params,
  })

  console.log('get info streamer - ', twitchResponse.data.data[0].broadcaster_type)

  const infoStreamer = twitchResponse.data.data

  if (infoStreamer.length === 0) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-2')
  }

  const isStreamer =
    infoStreamer[0].broadcaster_type === 'partner' ||
    infoStreamer[0].broadcaster_type === 'affiliate'

  console.log('isStreamer - ', isStreamer)
  if (isStreamer) {
    await db.transaction(async (trx) => {
      existingTwitchUser.isStreamer = isStreamer
      existingTwitchUser.useTransaction(trx)
      await existingTwitchUser.save()
    })
  }

  return response.ok({ result: isStreamer })
}

export default checkIfStreamer
