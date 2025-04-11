import { DataTrack } from '#interfaces/playlist_interface'
import Track from '#models/track'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class TrackService {
  static async addTrack(track: DataTrack, trx: TransactionClientContract): Promise<Track> {
    const existingTrack = await Track.query({ client: trx })
      .where('spotify_track_id', track.spotifyTrackId)
      .first()

    if (existingTrack) {
      return existingTrack
    } else {
      const newTrack = new Track()
      newTrack.spotifyTrackId = track.spotifyTrackId
      newTrack.trackName = track.trackName
      newTrack.artistName = track.artistName
      newTrack.album = track.album
      newTrack.cover = track.cover
      newTrack.url = track.url
      newTrack.useTransaction(trx)
      await newTrack.save()

      return newTrack
    }
  }
}
