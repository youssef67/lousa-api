import { DataTrack } from '#interfaces/playlist_interface'
import Track from '#models/track'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class TrackService {
  static async addTrack(track: DataTrack, trx: TransactionClientContract): Promise<Track> {
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
