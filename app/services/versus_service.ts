import { BroadcasterVersus, WinnerTrack } from '#interfaces/playlist_interface'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import ApiError from '#types/api_error'
import { VersusStatus } from '#types/versus.status'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export default class VersusService {
  static async validateAndGetVersus(id: string) {
    const versus = await TracksVersus.findBy('id', id)
    if (!versus) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'PCAT-1')
    }

    if (versus.trackWinner) {
      return null
    }

    return versus
  }

  static async createVersus(
    trx: TransactionClientContract,
    playlistId: string,
    track: Track
  ): Promise<TracksVersus> {
    const newVersus = new TracksVersus()
    newVersus.playlistId = playlistId
    newVersus.firstTrackId = track.id
    newVersus.secondTrackId = null
    newVersus.firstTrackScore = 0
    newVersus.secondTrackScore = 0
    newVersus.closingDate = DateTime.now().plus({ seconds: 15 })
    newVersus.useTransaction(trx)
    await newVersus.save()

    return newVersus
  }

  static async setActionVersus(
    track: Track,
    playlistId: string,
    trx: TransactionClientContract
  ): Promise<TracksVersus> {
    const lastVersusRecorded = await TracksVersus.query()
      .where('playlist_id', playlistId)
      .orderBy('created_at', 'desc')
      .first()

    // Si pas de versus enregistré, creation du 1er versus
    if (!lastVersusRecorded) {
      return this.createVersus(trx, playlistId, track)
    }

    // Si le dernier versus enregistré a déjà 2 tracks, creation d'un nouveau versus
    if (lastVersusRecorded.firstTrackId && lastVersusRecorded.secondTrackId) {
      return await this.createVersus(trx, playlistId, track)
    }

    // Si le dernier versus enregistré n'a qu'une track, ajout de la 2ème track
    lastVersusRecorded.secondTrackId = track.id
    lastVersusRecorded.useTransaction(trx)
    await lastVersusRecorded.save()

    return lastVersusRecorded
  }

  static async getTracksVersusBroadcasted(
    playlistId: string,
    trx: TransactionClientContract
  ): Promise<BroadcasterVersus | null> {
    let nextTracksVersus = await TracksVersus.query({ client: trx })
      .where('playlist_id', playlistId)
      .andWhere('status', VersusStatus.VotingProgress)
      .preload('firstTrack')
      .preload('secondTrack')
      .first()

    // Si aucun Versus actif, on cherche un OnHold à activer
    if (!nextTracksVersus) {
      nextTracksVersus = await TracksVersus.query({ client: trx })
        .where('playlist_id', playlistId)
        .andWhere('status', VersusStatus.OnHold)
        .preload('firstTrack')
        .preload('secondTrack')
        .first()

      if (nextTracksVersus) {
        nextTracksVersus.status = VersusStatus.VotingProgress
        nextTracksVersus.closingDate = DateTime.now().plus({ seconds: 15 }) // ← optionnel : nouvelle durée
        nextTracksVersus.useTransaction(trx)
        await nextTracksVersus.save()
      }
    }

    if (!nextTracksVersus) return null

    // Chargement des users liés
    const [firstUser, secondUser] = await Promise.all([
      nextTracksVersus.firstTrackUser ? User.findBy('id', nextTracksVersus.firstTrackUser) : null,
      nextTracksVersus.secondTrackUser ? User.findBy('id', nextTracksVersus.secondTrackUser) : null,
    ])

    const mapTrack = (track: Track | null, user: User | null): BroadcasterVersus['firstTrack'] => {
      if (!track) return null

      return {
        trackId: track.id,
        spotifyTrackId: track.spotifyTrackId,
        trackName: track.trackName,
        artistName: track.artistName,
        album: track.album,
        cover: track.cover,
        url: track.url,
        user: {
          id: user?.id ?? 'unknown',
          userName: user?.userName ?? null,
        },
      }
    }

    const versusBroadcasted: BroadcasterVersus = {
      id: nextTracksVersus.id,
      closingDate: nextTracksVersus.closingDate,
      firstTrackScore: nextTracksVersus.firstTrackScore,
      secondTrackScore: nextTracksVersus.secondTrackScore,
      firstTrack: mapTrack(nextTracksVersus.firstTrack, firstUser),
      secondTrack: mapTrack(nextTracksVersus.secondTrack, secondUser),
    }

    return versusBroadcasted
  }

  static async getExpiredTracksVersusToProcess(playlistId: string): Promise<TracksVersus[]> {
    const now = DateTime.now()

    const expiredTracksVersus = await TracksVersus.query()
      .where('closing_date', '<=', now.toJSDate())
      .andWhere('playlist_id', playlistId)

    return expiredTracksVersus
  }

  static async registerWinner(
    tracksVersus: TracksVersus,
    trx: TransactionClientContract
  ): Promise<WinnerTrack> {
    let winnerTrack: WinnerTrack = {
      trackId: null,
      userId: '',
      score: 0,
    }

    if (tracksVersus.firstTrackScore > tracksVersus.secondTrackScore) {
      // 1. Enregistrer le gagnant
      tracksVersus.status = VersusStatus.CompletedVotes
      tracksVersus.trackWinner = tracksVersus.firstTrackId
      tracksVersus.UserWinner = tracksVersus.firstTrackUser

      // 2 Définir l'objet de retour
      winnerTrack.trackId = tracksVersus.firstTrackId
      winnerTrack.userId = tracksVersus.firstTrack?.spotifyTrackId!
      winnerTrack.score = tracksVersus.firstTrackScore
    } else if (tracksVersus.firstTrackScore < tracksVersus.secondTrackScore) {
      // 1. Enregistrer le gagnant
      tracksVersus.status = VersusStatus.CompletedVotes
      tracksVersus.trackWinner = tracksVersus.secondTrackId
      tracksVersus.UserWinner = tracksVersus.secondTrackUser

      // 2 Définir l'objet de retour
      winnerTrack.trackId = tracksVersus.secondTrackId
      winnerTrack.userId = tracksVersus.secondTrack?.spotifyTrackId!
      winnerTrack.score = tracksVersus.secondTrackScore
    } else {
      tracksVersus.status = VersusStatus.CompletedVotes
    }

    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    return winnerTrack
  }

  static async createTracksVersusCommand(
    trx: TransactionClientContract,
    playlistId: string,
    firstTrack: Track,
    secondTrack: Track,
    firstUser: User,
    secondUser: User,
    status: VersusStatus
  ): Promise<TracksVersus> {
    const newVersus = new TracksVersus()
    newVersus.playlistId = playlistId
    newVersus.firstTrackId = firstTrack.id
    newVersus.secondTrackId = secondTrack.id
    newVersus.firstTrackScore = 0
    newVersus.firstTrackUser = firstUser.id
    newVersus.secondTrackScore = 0
    newVersus.secondTrackUser = secondUser.id
    newVersus.status = status
    newVersus.closingDate = DateTime.now().plus({ second: 15 })
    newVersus.useTransaction(trx)
    await newVersus.save()

    return newVersus
  }
}
