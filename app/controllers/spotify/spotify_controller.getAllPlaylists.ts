import type { HttpContext } from '@adonisjs/core/http'
import Playlist from '#models/playlist'
import { ModelStatus } from '#types/model_status'

const getAllPlaylists = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const playlistsArray = await Playlist.query().where({
    userId: currentUser.id,
    status: ModelStatus.Enabled,
  })

  console.log('playlistsArray')
  const serializedPlaylists = playlistsArray.map((playlist) => playlist.serializePlaylist())

  return response.ok({
    playlists: serializedPlaylists,
  })
}

export default getAllPlaylists
