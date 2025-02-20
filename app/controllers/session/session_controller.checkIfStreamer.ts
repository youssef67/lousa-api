import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'
import env from '#start/env'
import SpaceStreamer from '#models/space_streamer'

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

  const infoStreamer = twitchResponse.data.data

  if (infoStreamer.length === 0) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCGS-2')
  }

  let isStreamer =
    infoStreamer[0].broadcaster_type === 'partner' ||
    infoStreamer[0].broadcaster_type === 'affiliate'

  // Pour la phase de développement, je set le is streamer à true
  // TODO : A supprimer en prod
  isStreamer = true

  if (isStreamer) {
    const spaceStreamerExisting = await SpaceStreamer.query()
      .where('twitch_id', existingTwitchUser.twitchId)
      .first()

    let spaceStreamer: SpaceStreamer

    if (!spaceStreamerExisting) {
      spaceStreamer = new SpaceStreamer()
    } else {
      spaceStreamer = spaceStreamerExisting
    }

    await db.transaction(async (trx) => {
      spaceStreamer.twitchUserId = existingTwitchUser.id
      spaceStreamer.nameSpace = existingTwitchUser.twitchUserLogin
      spaceStreamer.twitchId = existingTwitchUser.twitchId
      spaceStreamer.twitchUserLogin = existingTwitchUser.twitchUserLogin
      spaceStreamer.spaceStreamerImg = existingTwitchUser.twitchUserImgProfile
      spaceStreamer.useTransaction(trx)
      await spaceStreamer.save()

      existingTwitchUser.spaceStreamerId = spaceStreamer.id
      existingTwitchUser.useTransaction(trx)
      await existingTwitchUser.save()
    })
  }

  return response.ok({
    twitchUser: existingTwitchUser.serializeAsSession(),
  })
}

export default checkIfStreamer
