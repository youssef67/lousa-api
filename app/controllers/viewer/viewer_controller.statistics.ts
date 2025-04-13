import type { HttpContext } from '@adonisjs/core/http'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import PlaylistTrack from '#models/playlist_track'

const statistics = async ({ response, request, currentDevice }: HttpContext) => {
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const allTracksVersusOfCurrentUser = await TracksVersus.query()
    .where('first_track_user', currentUser.id)
    .orWhere('second_track_user', currentUser.id)

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
    (tracksVersus) => tracksVersus.userWinner === currentUser.id
  )

  console.log('tracksVersusCompleted', tracksVersusCompleted.length)
  console.log('tracksVersusVotingInProgress', tracksVersusVotingInProgress.length)
  console.log('tracksVersusOnHold', tracksVersusOnHold.length)
  console.log('tracksVersusWon', tracksVersusWon.length)

  const playlistTracksOnTop = await PlaylistTrack.query()
    .where('user_id', currentUser.id)
    .andWhereBetween('position', [1, 3])

  const playlistsRanked = await PlaylistTrack.query()
    .where('user_id', currentUser.id)
    .andWhere('is_ranked', true)

  console.log('playlistsOnTop', playlistTracksOnTop.length)
  console.log('playlistsRanked', playlistsRanked.length)

  return response.ok({
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
