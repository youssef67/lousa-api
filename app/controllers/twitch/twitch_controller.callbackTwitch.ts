import TwitchUser from '#models/twitch_user'
import type { HttpContext } from '@adonisjs/core/http'
import { TwitchDriver } from 'Twitch-driver'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import transmit from '@adonisjs/transmit/services/main'
import User from '#models/user'
import { ModelStatus } from '#types/model_status'
import SpaceStreamer from '#models/space_streamer'

const callbackTwitch = async ({ ally, response, request }: HttpContext) => {
  // TODO : supprimer ou marquer comme delete l'utilisateur twitch si la requete ne fonctionne pas
  try {
    const twitch = ally.use('twitch') as TwitchDriver
    const user = await twitch.user()

    const state = request.encryptedCookie('twitch_oauth_state')

    const existingTwitchUser = await TwitchUser.findBy('state', state)

    if (!existingTwitchUser) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'ACCT-1')
    }

    if (existingTwitchUser.state !== state) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'ACCT-2')
    }

    const existingUser = await User.findBy('id', existingTwitchUser.userId)

    if (!existingUser) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'ACCT-3')
    }

    // TODO : a enlever en prod
    const spaceStreamer = await SpaceStreamer.query()
      .where('twitch_user_id', existingTwitchUser.id)
      .first()

    if (!spaceStreamer) throw ApiError.newError('ERROR_INVALID_DATA', 'ACCT-4')
    // TODO : fin du TODO

    await db.transaction(async (trx) => {
      existingTwitchUser.twitchId = spaceStreamer.twitchId //<---- test line
      // existingTwitchUser.twitchId = user.id <--- this is the original code
      existingTwitchUser.twitchUserLogin = spaceStreamer.twitchUserLogin //<---- test line
      // existingTwitchUser.twitchUserLogin = user.nickName <--- this is the original code
      existingTwitchUser.emailTwitch = user.email ?? ''
      existingTwitchUser.twitchUserImgProfile = user.avatarUrl ?? ''
      existingTwitchUser.accessToken = user.token.token
      existingTwitchUser.refreshToken = user.token.refreshToken
      existingTwitchUser.status =
        existingTwitchUser.status === ModelStatus.Deleted
          ? ModelStatus.Enabled
          : existingTwitchUser.status
      existingTwitchUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({
        seconds: user.token.expiresIn,
      })
      existingTwitchUser.useTransaction(trx)
      await existingTwitchUser.save()

      // Mise à jour de l'utilisateur avec l'id twitchUser
      existingUser.twitchUserId = existingTwitchUser.id
      existingUser.useTransaction(trx)
      await existingUser.save()
    })

    // nettoyage du cookie
    response.clearCookie('twitch_oauth_state')

    // Mise en place du broadcast pour la mise à jour de la session
    transmit.broadcast(`authentication/twitch/${existingTwitchUser.userId}`, {
      twitchUser: JSON.stringify(existingTwitchUser.serializeAsSession()),
    })
  } catch (error) {
    return response.status(500).send(error)
  }
}

export default callbackTwitch
