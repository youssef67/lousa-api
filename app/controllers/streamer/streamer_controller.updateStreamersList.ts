import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import { DateTime } from 'luxon'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'
import env from '#start/env'

const updateStreamersList = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const existingTwitchUser = await TwitchUser.findBy('user_id', currentUser.id)
  if (!existingTwitchUser) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'TCUS-1')
  }

  const accessToken = existingTwitchUser.accessToken
  const clientId = env.get('TWITCH_CLIENT_ID')

  let allStreams: any[] = []
  let cursor: string | null = null
  const limit = 100

  try {
    do {
      const params: any = {
        language: 'fr',
        first: limit,
      }

      if (cursor) {
        params.after = cursor
      }

      const twitchResponse = await axios.get('https://api.twitch.tv/helix/streams', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
        },
        params,
      })

      allStreams = allStreams.concat(twitchResponse.data.data)

      cursor = twitchResponse.data.pagination?.cursor || null
    } while (cursor)

    let totalViewers: number = 0

    const filteredStreams = allStreams.filter((stream) => {
      if (stream.viewer_count >= 50 && stream.viewer_count <= 500) {
        totalViewers += stream.viewer_count
        return true
      }
      return false
    })

    const filteredStreamWithThumbnails = await Promise.all(
      filteredStreams.map(async (stream) => {
        const params: any = {
          query: stream.user_login,
          first: 1,
        }

        const twitchResponse = await axios.get('https://api.twitch.tv/helix/search/channels', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-ID': clientId,
          },
          params,
        })

        return twitchResponse.data.data[0]
      })
    )

    await db.transaction(async (trx) => {
      for (const stream of filteredStreamWithThumbnails) {
        // if (stream !== undefined) {
        //   const existingStream = await TwitchStream.findBy('user_login', stream.broadcaster_login)
        //   if (!existingStream) {
        //     await TwitchStream.create(
        //       {
        //         userId: currentUser.id,
        //         twitchId: stream.id,
        //         userLogin: stream.broadcaster_login,
        //         userName: stream.display_name,
        //         thumbnailUrl: stream.thumbnail_url,
        //       },
        //       { client: trx }
        //     )
        //   }
        // }
      }
    })

    const currentDate = DateTime.now().toISO()

    return response.ok({ dateLastUpdate: currentDate })
  } catch (error) {
    console.error('Erreur lors de l’appel à l’API Twitch:', error.response?.data || error.message)

    return response.status(500).json({
      result: false,
      message: 'Erreur lors de la récupération des streams depuis Twitch',
      error: error.response?.data || error.message,
    })
  }
}

export default updateStreamersList
