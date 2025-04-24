import type { HttpContext } from '@adonisjs/core/http'
import { setGoldenLikeValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import {
  sanitizePlaylistTracks,
  sanitizeTracksVersus,
  sanitizeUser,
} from '#utils/sanitize_broadcast'
import db from '@adonisjs/lucid/services/db'
import VersusService from '#services/versus_service'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import Track from '#models/track'
import PlaylistService from '#services/playlist_service'
import SpotifyService from '#services/spotify_service'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import { TracksVersusStatus } from '#types/versus.status'
import { MAX_TRACKS } from '#config/playlist_limits'

const setGoldenLike = async ({ request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(setGoldenLikeValidator)
  await currentDevice.load('user', (userQuery) => {
    userQuery.preload('twitchUser', (twitchUserQuery) => {
      twitchUserQuery.preload('spaceStreamer', (spaceStreamerQuery) => {
        spaceStreamerQuery.preload('spotifyUser')
      })
    })
  })
  const currentUser = currentDevice.user

  const maxTrackOnPlaylist = MAX_TRACKS

  const tracksVersusExisting = await TracksVersus.query()
    .where('id', payload.tracksVersusId)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSGL-1')
  }

  const playlistExisting = await Playlist.query()
    .where('id', tracksVersusExisting.playlistId)
    .preload('playlistTracks', (playlistTrackQuery) => {
      playlistTrackQuery.where('is_ranked', true).preload('user').orderBy('position', 'asc')
    })
    .first()

  if (!playlistExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSGL-2')
  }

  let userWinner: User | null
  let playlistTracksRanked: PlaylistTrack[] = []
  await db.transaction(async (trx) => {
    const res = await VersusService.setWinnerGoldenLike(
      tracksVersusExisting,
      payload.targetTrack,
      trx
    )

    userWinner = await User.query().where('id', res.winnerTrack.userId).first()

    if (!userWinner) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCSGL-3')
    }

    userWinner.victoryPoints += 50
    userWinner.useTransaction(trx)
    await userWinner.save()

    const trackExisting = await Track.query().where('id', res.winnerTrack.trackId).first()

    playlistTracksRanked = await PlaylistService.addRankedTrackAndReorder(
      {
        playlistId: tracksVersusExisting.playlistId,
        trackId: res.winnerTrack.trackId,
        userId: res.winnerTrack.userId,
        score: res.winnerTrack.score,
        specialScore: res.winnerTrack.specialScore,
        maxTracks: maxTrackOnPlaylist,
      },
      trx
    )

    // d. Assurer un token Spotify valide
    const spotifyUser = await SpotifyService.ensureValidToken(
      currentUser.twitchUser.spaceStreamer.spotifyUser,
      trx
    )
    // e. Ajouter la track dans la playlist Spotify
    const snapshot = await SpotifyService.addTrackToSpotifyPlaylist(
      playlistExisting,
      trackExisting?.spotifyTrackId!,
      spotifyUser.accessToken
    )
    // f. Mettre à jour le snapshot en BDD
    await PlaylistService.updateSnapshotId(playlistExisting.id, snapshot, trx)
  })

  const playlistsTracksUpdated =
    await PlaylistService.getRankedPlaylistTracksFormatted(playlistTracksRanked)

  transmit.broadcast(`playlist/updated/${playlistExisting.id}`, {
    playlistTracksUpdated: sanitizePlaylistTracks(playlistsTracksUpdated),
    userWinner: sanitizeUser(userWinner!.serializeAsSession()),
  })

  let trackVersus: TracksVersus | null

  trackVersus = await VersusService.getTracksVersusByPlaylistIdAndStatus(
    tracksVersusExisting.playlistId,
    TracksVersusStatus.VotingProgress
  )

  if (!trackVersus) {
    trackVersus = await VersusService.getTracksVersusByPlaylistIdAndStatus(
      tracksVersusExisting.playlistId,
      TracksVersusStatus.MissingTracks
    )
  }

  const currentTracksVersus = await VersusService.tracksVersusBroadcasted(
    trackVersus,
    currentUser.id
  )

  transmit.broadcast(`playlist/tracksVersus/${playlistExisting.id}`, {
    currentTracksVersus: sanitizeTracksVersus(currentTracksVersus),
  })
}

export default setGoldenLike
