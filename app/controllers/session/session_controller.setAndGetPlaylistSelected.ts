import type { HttpContext } from '@adonisjs/core/http'
import { setAndGetPlaylistSelectedValidator } from '#validators/session'
import ApiError from '#types/api_error'
import loggerW from '#config/winston_logger'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Playlist from '#models/playlist'

const setAndGetPlaylistSelected = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(setAndGetPlaylistSelectedValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  if (payload.playlistId) {
    const userHasPlaylistSelected = await User.query()
      .where('playlistSelected', payload.playlistId)
      .first()

    if (userHasPlaylistSelected?.playlistSelected !== payload.playlistId) {
      try {
        await db.transaction(async (trx) => {
          currentUser.playlistSelected = payload.playlistId
          currentUser.useTransaction(trx)
          await currentUser.save()
        })
      } catch (error) {
        loggerW.error(error)
        throw ApiError.newError('ERROR_INVALID_DATA', 'SCSGP-1')
      }
    }
  }

  const playlistSelected = await Playlist.findBy('id', currentUser.playlistSelected)

  return response.ok({ playlist: playlistSelected?.serializePlaylist() ?? null })
}

export default setAndGetPlaylistSelected
