import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Playlist from '#models/playlist'

const setAndGetPlaylistSelected = async ({ response, request, currentDevice }: HttpContext) => {
  const playlistId = request.input('playlistId')
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  // update playlistSelected
  await db.transaction(async (trx) => {
    currentUser.playlistSelected = playlistId
    currentUser.useTransaction(trx)
    await currentUser.save()
  })

  console.log('playlistId', playlistId)

  const playlistSelected = await Playlist.query()
    .where('id', playlistId)
    .preload('playlistTracks')
    .preload('spaceStreamer')
    .first()

  const playlistSelectedData = {
    id: playlistSelected?.id,
    playlistName: playlistSelected?.playlistName,
    spaceStreamerName: playlistSelected?.spaceStreamer.nameSpace,
    spaceStreamerImg: playlistSelected?.spaceStreamer.spaceStreamerImg,
    nbTracks: playlistSelected?.playlistTracks.length,
  }

  console.log('playlistSelectedData', playlistSelectedData)

  return response.ok({ playlistSelectedData })
}

export default setAndGetPlaylistSelected
