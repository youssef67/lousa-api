import type { HttpContext } from '@adonisjs/core/http'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import PlaylistTrack from '#models/playlist_track'
import ApiError from '#types/api_error'
import User from '#models/user'

const statistics = async ({ response, request, currentDevice }: HttpContext) => {
  const userId = request.input('userId')
  await currentDevice.load('user')

  const user = await User.findBy('id', userId)

  if (!user) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'VCGS-1')
  }

  const allTracksVersusOfCurrentUser = await TracksVersus.query()
    .where('first_track_user', userId)
    .orWhere('second_track_user', userId)

  const tracksVersusCompleted = allTracksVersusOfCurrentUser.filter(
    (tracksVersus) => tracksVersus.status === TracksVersusStatus.CompletedVotes
  )

  const tracksVersusVotingInProgress = allTracksVersusOfCurrentUser.filter(
    (tracksVersus) => tracksVersus.status === TracksVersusStatus.VotingProgress
  )

  const tracksVersusOnHold = allTracksVersusOfCurrentUser.filter(
    (tracksVersus) => tracksVersus.status === TracksVersusStatus.OnHold
  )

  const tracksVersusWon = allTracksVersusOfCurrentUser.filter(
    (tracksVersus) => tracksVersus.userWinner === userId
  )

  const playlistTracksOnTop = await PlaylistTrack.query()
    .where('user_id', userId)
    .andWhereBetween('position', [1, 3])

  const playlistsRanked = await PlaylistTrack.query()
    .where('user_id', userId)
    .andWhere('is_ranked', true)

  return response.ok({
    userName: user.userName,
    tracksVersus: {
      completed: tracksVersusCompleted.length,
      votingInProgress: tracksVersusVotingInProgress.length,
      onHold: tracksVersusOnHold.length,
      won: tracksVersusWon.length,
    },
    tracks: {
      top: playlistTracksOnTop.length,
      ranked: playlistsRanked.length,
    },
  })
}

export default statistics
