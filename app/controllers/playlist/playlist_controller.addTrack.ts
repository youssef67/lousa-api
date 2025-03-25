import type { HttpContext } from '@adonisjs/core/http'
import { addTrackValidator } from '#validators/playlist'
import ApiError from '#types/api_error'
import transmit from '@adonisjs/transmit/services/main'
import { sanitizePlaylistTracks } from '#utils/sanitize_broadcast'
import Playlist from '#models/playlist'
import db from '@adonisjs/lucid/services/db'
import axios from 'axios'
import PlaylistTrack from '#models/playlist_track'
import Track from '#models/track'
import { TrackStatus } from '#types/track_status'
import { DateTime } from 'luxon'
import TracksVersus from '#models/tracks_versus'
import PlaylistPendingTrack from '#models/playlist_pending_track'
import { BroadcasterTrack } from '#interfaces/playlist_interface'

const addTrack = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(addTrackValidator)
  await currentDevice.load('user')

  const maxTrackOnPlaylist = 20

  const versusTrackExisting = await TracksVersus.findBy('id', payload.versusId)

  if (!versusTrackExisting) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
  }

  if (versusTrackExisting.winner) {
    console.log('vainqueur déjà enregistré')
    return response.ok({ playlistTracksUpdated: [] })
  }

  const playlist = await Playlist.query()
    .where('id', versusTrackExisting.playlistId)
    .preload('spaceStreamer', (spaceStreamerQuery) => {
      spaceStreamerQuery.preload('spotifyUser')
    })
    .first()

  if (!playlist) {
    throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-3')
  }

  console.log('playlistId ', versusTrackExisting.playlistId)
  console.log('trackId ', payload.winnerTrack.trackId)

  let tracksToKeep: PlaylistTrack[] = []
  await db.transaction(async (trx) => {
    // Met à jour le versus avec la track gagnante
    versusTrackExisting.winner = payload.winnerTrack.trackId
    versusTrackExisting.useTransaction(trx)
    await versusTrackExisting.save()

    // Ajoute la track gagnante dans la playlist
    const newRankedTrack = new PlaylistTrack()
    newRankedTrack.userId = payload.winnerTrack.userId
    newRankedTrack.playlistId = versusTrackExisting.playlistId
    newRankedTrack.trackId = payload.winnerTrack.trackId
    newRankedTrack.isRanked = true
    newRankedTrack.score = payload.winnerTrack.score
    newRankedTrack.useTransaction(trx)
    await newRankedTrack.save()

    // Récupère les tracks triées par score et ancienneté
    const updatedRankedTracks = await PlaylistTrack.query({ client: trx })
      .where('playlist_id', versusTrackExisting.playlistId)
      .andWhere('is_ranked', true)
      .preload('user')
      .orderBy('score', 'desc')
      .orderBy('created_at', 'asc')

    // Ne garde que les 20 premiers
    tracksToKeep = updatedRankedTracks.slice(0, maxTrackOnPlaylist)
    const tracksToDelete = updatedRankedTracks.slice(maxTrackOnPlaylist)

    // Met à jour les positions
    tracksToKeep.forEach((track, index) => {
      track.merge({ position: index + 1 }).useTransaction(trx)
    })

    // Sauvegarde les positions
    await Promise.all(tracksToKeep.map((track) => track.save()))

    if (tracksToDelete.length > 0) {
      tracksToDelete.forEach((track) => {
        track.isRanked = false
        track.status = TrackStatus.Inactive
        track.useTransaction(trx)
      })
      await Promise.all(tracksToDelete.map((track) => track.save()))
    }

    // delete pending tracks
    await PlaylistPendingTrack.query({ client: trx })
      .where('playlist_id', playlist.id)
      .andWhere('track_id', versusTrackExisting.firstTrackId)
      .delete()

    await PlaylistPendingTrack.query({ client: trx })
      .where('playlist_id', playlist.id)
      .andWhere('track_id', versusTrackExisting.secondTrackId)
      .delete()

    // Get spotify user
    const spotifyUser = playlist.spaceStreamer.spotifyUser

    if (spotifyUser.isAccessTokenExpired()) {
      const newAccessToken = await spotifyUser.refreshAccessToken()

      spotifyUser.accessToken = newAccessToken.access_token
      spotifyUser.tokenExpiresAt = DateTime.fromJSDate(new Date()).plus({
        seconds: newAccessToken.expires_in,
      })
      spotifyUser.scope = newAccessToken.scope
      spotifyUser.useTransaction(trx)
      await spotifyUser.save()
    }

    //Add track to the playlist on Spotify
    const addTrackRequest = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyPlaylistId}/tracks`,
      {
        uris: [`spotify:track:${payload.winnerTrack.spotifyTrackId}`],
        snapshot_id: playlist.spotifySnapShotId,
      },
      {
        headers: {
          'Authorization': `Bearer ${spotifyUser.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (addTrackRequest.status !== 201) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'VCAT-2')
    }

    // Update the playlist snapshot id
    await Playlist.query({ client: trx }).where('id', playlist.id).update({
      spotifySnapShotId: addTrackRequest.data.snapshot_id,
    })
  })

  // Requet pour les tests
  // ----------------------------------------------------
  const updatedRankedTracks = await PlaylistTrack.query()
    .where('playlist_id', versusTrackExisting.playlistId)
    .andWhere('is_ranked', true)
    .preload('user')
    .orderBy('score', 'desc')
    .orderBy('created_at', 'asc')

  // Ne garde que les 20 premiers
  tracksToKeep = updatedRankedTracks.slice(0, maxTrackOnPlaylist)
  // ----------------------------------------------------

  const trackIds = tracksToKeep.map((t) => t.trackId)
  const allTracks = await Track.query().whereIn('id', trackIds)
  const trackMap = new Map(allTracks.map((t) => [t.id, t]))

  const playlistTracksUpdated: BroadcasterTrack[] = await Promise.all(
    tracksToKeep.map(async (track: PlaylistTrack) => {
      const trackData = trackMap.get(track.trackId)

      if (!trackData) {
        throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-3')
      }

      return { ...trackData.serializeTrack(), ...track.serializePlaylistTrack() }
    })
  )

  const cleanTracks = sanitizePlaylistTracks(playlistTracksUpdated)
  transmit.broadcast(`playlist/updated/${versusTrackExisting.playlistId}`, {
    playlistTracksUpdated: cleanTracks,
  })
}

export default addTrack
