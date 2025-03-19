import type { HttpContext } from '@adonisjs/core/http'
import { setAndGetPlaylistSelectedValidator } from '#validators/streamer'
import db from '@adonisjs/lucid/services/db'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import User from '#models/user'

const setAndGetPlaylistSelected = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(setAndGetPlaylistSelectedValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const user = await User.query()
    .where('id', currentUser.id)
    .preload('twitchUser', (queryTwitchUser) => {
      queryTwitchUser.preload('spaceStreamer')
    })
    .first()

  if (!user) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCSGP-1')
  }

  await db.transaction(async (trx) => {
    user.twitchUser.spaceStreamer.lastPlaylistIdSelected = payload.playlistId
    user.twitchUser.spaceStreamer.useTransaction(trx)
    await user.twitchUser.spaceStreamer.save()
  })

  const playlist = await Playlist.query()
    .where('id', payload.playlistId)
    .preload('playlistTracks')
    .preload('spaceStreamer')
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'SCSGP-2')
  }

  const playlistSelected = {
    id: playlist?.id,
    playlistName: playlist?.playlistName,
    nbTracks: playlist?.playlistTracks.length,
  }

  return response.ok({ playlistSelected })
}

export default setAndGetPlaylistSelected
