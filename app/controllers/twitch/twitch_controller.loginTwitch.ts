import type { HttpContext } from '@adonisjs/core/http'
import { TwitchDriver } from 'Twitch-driver'
import ApiError from '#types/api_error'
import db from '@adonisjs/lucid/services/db'
import TwitchUser from '#models/twitch_user'

const loginTwitch = async ({ ally, response, request, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // Utilisation de la librairie ally pour récupérer l'url de redirection
  const twitch = ally.use('twitch') as TwitchDriver

  const url = await twitch.redirectUrl((innerRequest) => {
    innerRequest.scopes(['user:read:email'])
    innerRequest.param('response_type', 'code')
    innerRequest.param('force_verify', true)
  })

  if (!url) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACLT-1')
  }

  // Vérification de l'existence d'un utilisateur twitch déjà enregistré
  const existingTwitchUser = await TwitchUser.query().where('userId', currentUser.id).first()
  // if (existingTwitchUser) {
  //   throw ApiError.newError('ERROR_INVALID_DATA', 'ACLT-2')
  //   retourner true si c'est un streamer, QUI refresh du token
  // }

  const state = request.encryptedCookie('twitch_oauth_state')

  if (!state) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'ACLT-3')
  }

  // Préparation de l'insertion finale en base de données avec un pré-enregistrement de l'utilisateur
  await db.transaction(async (trx) => {
    if (existingTwitchUser) {
      existingTwitchUser.state = state
      existingTwitchUser.useTransaction(trx)
      await existingTwitchUser.save()
    } else {
      const twitchUser = new TwitchUser()
      twitchUser.userId = currentUser.id
      twitchUser.state = state
      twitchUser.useTransaction(trx)
      await twitchUser.save()
    }
  })

  // await new Promise((resolve) => setTimeout(resolve, 500))

  return response.ok({ url: url })
}

export default loginTwitch
