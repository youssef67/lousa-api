import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Playlist from '#models/playlist'
import PlaylistTrack from '#models/playlist_track'
import { TrackStatus } from '#types/track_status'
import ApiError from '#types/api_error'

interface AddTrackOptions {
  playlistId: string
  trackId: string
  userId: string
  score: number
  specialScore: number
  maxTracks?: number
}

export default class PlaylistService {
  /**
   * Ajoute une track classée à une playlist, met à jour les positions et supprime les tracks dépassant la limite.
   */
  static async addRankedTrackAndReorder(
    options: AddTrackOptions,
    trx: TransactionClientContract
  ): Promise<PlaylistTrack[]> {
    const { playlistId, trackId, userId, score, specialScore, maxTracks = 8 } = options

    // 1. Ajouter la track gagnante
    const newTrack = new PlaylistTrack()
    newTrack.playlistId = playlistId
    newTrack.trackId = trackId
    newTrack.userId = userId
    newTrack.score = score
    newTrack.specialScore = specialScore
    newTrack.isRanked = true
    newTrack.status = TrackStatus.Active
    newTrack.useTransaction(trx)
    await newTrack.save()

    // 2. Récupérer toutes les tracks classées
    const rankedTracks = await PlaylistTrack.query({ client: trx })
      .where('playlist_id', playlistId)
      .andWhere('is_ranked', true)
      .preload('user')
      .orderBy('score', 'desc')
      .orderBy('created_at', 'asc')

    // 3. Garder les N meilleurs (par défaut 20)
    const tracksToKeep = rankedTracks.slice(0, maxTracks)
    const tracksToRemove = rankedTracks.slice(maxTracks)

    // 4. Mettre à jour les positions
    let i = 1
    for (const track of tracksToKeep) {
      track.position = i
      track.useTransaction(trx)
      i++
    }

    await Promise.all(
      tracksToKeep.map((t) => {
        t.useTransaction(trx)
        t.save()
      })
    )

    // 5. Déclasser les autres (désactiver)
    for (const track of tracksToRemove) {
      track.isRanked = false
      track.status = TrackStatus.Inactive
      track.position = null
      track.useTransaction(trx)
    }

    await Promise.all(
      tracksToRemove.map((t) => {
        t.useTransaction(trx)
        t.save()
      })
    )

    return tracksToKeep
  }

  /**
   * Met à jour le snapshot ID Spotify dans la base
   */
  static async updateSnapshotId(
    playlistId: string,
    newSnapshotId: string,
    trx: TransactionClientContract
  ) {
    const updated = await Playlist.query({ client: trx })
      .where('id', playlistId)
      .update({ spotifySnapShotId: newSnapshotId })

    if (!updated) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'PLSVC-1')
    }
  }

  /**
   * Récupère la playlist avec le Spotify user
   */
  static async getPlaylistWithSpotifyUser(playlistId: string) {
    const playlist = await Playlist.query()
      .where('id', playlistId)
      .preload('spaceStreamer', (q) => q.preload('spotifyUser'))
      .first()

    if (!playlist) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'PLSVC-2')
    }

    return playlist
  }

  static async getPlaylistTracksRanked(
    playlistId: string,
    trx: TransactionClientContract
  ): Promise<PlaylistTrack[]> {
    const rankedTracks = await PlaylistTrack.query({ client: trx })
      .where('playlist_id', playlistId)
      .andWhere('is_ranked', true)
      .preload('user')
      .orderBy('score', 'desc')
      .orderBy('created_at', 'asc')

    return rankedTracks
  }
}
