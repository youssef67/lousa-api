import type { HttpContext } from '@adonisjs/core/http'
import { addStreamerValidator } from '#validators/twitch'
import axios from 'axios'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'
import env from '#start/env'

const addStreamer = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addStreamerValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const existingTwitchUser = await TwitchUser.findBy('user_id', currentUser.id)
  if (!existingTwitchUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-1')
  }

  const accessToken = existingTwitchUser.accessToken
  const clientId = env.get('TWITCH_CLIENT_ID')

  const params: any = {
    query: payload.nameStreamer,
    first: 1,
  }

  const twitchResponse = await axios.get('https://api.twitch.tv/helix/search/channels', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-ID': clientId,
    },
    params,
  })

  const twitchData = twitchResponse.data.data

  if (twitchData.length === 0) {
    return response.ok({ result: false })
  }

  const streamer = twitchData[0]

  // const newStreamer = new TwitchStream()
  // await db.transaction(async (trx) => {
  //   newStreamer.userId = currentUser.id
  //   newStreamer.userLogin = streamer.broadcaster_login
  //   newStreamer.userName = streamer.display_name
  //   newStreamer.thumbnailUrl = streamer.thumbnail_url
  //   newStreamer.useTransaction(trx)
  //   await newStreamer.save()
  // })

  return response.ok({ result: true })
}

export default addStreamer
