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

  const maxTrackOnPlaylist = 20

  const tracksVersusExisting = await TracksVersus.findBy('id', payload.tracksVersusId)

  if (!tracksVersusExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSGL-1')
  }

  const playlistExisting = await Playlist.findBy('id', tracksVersusExisting.playlistId)

  if (!playlistExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCSGL-2')
  }

  let userWinner: User | null
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

    await PlaylistService.addRankedTrackAndReorder(
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

  const playlistTracksRanked = await PlaylistService.getPlaylistTracksRanked(playlistExisting.id)

  const playlistsTracksUpdated = await Promise.all(
    playlistTracksRanked.map(async (playlistTrack: PlaylistTrack) => {
      const trackData = await Track.findBy('id', playlistTrack.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCGP-2')
      }

      return { ...trackData.serializeTrack(), ...playlistTrack.serializePlaylistTrack() }
    })
  )

  transmit.broadcast(`playlist/updated/${playlistExisting.id}`, {
    playlistTracksUpdated: sanitizePlaylistTracks(playlistsTracksUpdated),
    userWinner: sanitizeUser(userWinner!.serializeAsSession()),
  })

  let trackVersus: TracksVersus | null

  trackVersus = await TracksVersus.query()
    .where('playlist_id', tracksVersusExisting.playlistId)
    .andWhere('status', TracksVersusStatus.VotingProgress)
    .preload('firstTrack')
    .preload('secondTrack')
    .preload('likeTracks')
    .first()

  if (!trackVersus) {
    trackVersus = await TracksVersus.query()
      .where('playlist_id', tracksVersusExisting.playlistId)
      .andWhere('status', TracksVersusStatus.MissingTracks)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()
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
