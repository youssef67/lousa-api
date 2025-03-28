import axios from 'axios'
import { DateTime } from 'luxon'
import SpotifyUser from '#models/spotify_user'
import ApiError from '#types/api_error'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Playlist from '#models/playlist'

export default class SpotifyService {
  static async ensureValidToken(spotifyUser: SpotifyUser, trx: TransactionClientContract) {
    if (!spotifyUser.isAccessTokenExpired()) return spotifyUser

    const newToken = await spotifyUser.refreshAccessToken()

    spotifyUser.accessToken = newToken.access_token
    spotifyUser.tokenExpiresAt = DateTime.now().plus({ seconds: newToken.expires_in })
    spotifyUser.scope = newToken.scope
    spotifyUser.useTransaction(trx)
    await spotifyUser.save()

    return spotifyUser
  }

  static async addTrackToSpotifyPlaylist(playlist: Playlist, trackId: string, accessToken: string) {
    const res = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist.spotifyPlaylistId}/tracks`,
      {
        uris: [`spotify:track:${trackId}`],
        snapshot_id: playlist.spotifySnapShotId,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (res.status !== 201) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SSAT-2')
    }

    return res.data.snapshot_id
  }
}
