import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#types/api_error'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import User from '#models/user'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import VersusService from '#services/versus_service'

const getPlaylistSelected = async ({ response, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const userExisting = await User.findBy('id', currentUser.id)

  if (!userExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCGPS-1')
  }

  return response.ok({
    playlistId: userExisting.playlistSelected,
  })
}

export default getPlaylistSelected
