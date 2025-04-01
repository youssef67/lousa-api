import { BroadcasterVersus, WinnerTrack } from '#interfaces/playlist_interface'
import LikeTrack from '#models/like_track'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import ApiError from '#types/api_error'
import { TracksVersusStatus } from '#types/versus.status'
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
    userId: string,
    trx: TransactionClientContract
  ): Promise<BroadcasterVersus | null> {
    let nextTracksVersus = await TracksVersus.query({ client: trx })
      .where('playlist_id', playlistId)
      .andWhere('status', TracksVersusStatus.VotingProgress)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()

    // Si aucun Versus actif, on cherche un OnHold à activer
    if (!nextTracksVersus) {
      nextTracksVersus = await TracksVersus.query({ client: trx })
        .where('playlist_id', playlistId)
        .andWhere('status', TracksVersusStatus.OnHold)
        .preload('firstTrack')
        .preload('secondTrack')
        .first()

      if (nextTracksVersus) {
        nextTracksVersus.status = TracksVersusStatus.VotingProgress
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

    let nbLikesOfFirstTrack: LikeTrack[] = []
    let nbLikesOfSecondTrack: LikeTrack[] = []
    let firstTrackIsLikedByUser = false
    let secondTrackIsLikedByUser = false
    if (nextTracksVersus.likeTracks) {
      nbLikesOfFirstTrack = nextTracksVersus.likeTracks.filter(
        (like) => like.trackId === nextTracksVersus.firstTrackId
      )
      firstTrackIsLikedByUser = nbLikesOfFirstTrack.some((like) => like.userId === userId)

      nbLikesOfSecondTrack = nextTracksVersus.likeTracks.filter(
        (like) => like.trackId === nextTracksVersus.secondTrackId
      )

      secondTrackIsLikedByUser = nbLikesOfSecondTrack.some((like) => like.userId === userId)
    }

    const mapTrack = (
      track: Track | null,
      user: User | null,
      nbLikes: number,
      isLikedByUser: boolean
    ): BroadcasterVersus['firstTrack'] => {
      if (!track) return null

      return {
        trackId: track.id,
        spotifyTrackId: track.spotifyTrackId,
        trackName: track.trackName,
        artistName: track.artistName,
        album: track.album,
        cover: track.cover,
        url: track.url,
        nbLikes,
        isLikedByUser,
        user: {
          id: user?.id ?? 'unknown',
          userName: user?.userName ?? null,
        },
      }
    }

    const tracksVersusBroadcasted: BroadcasterVersus = {
      id: nextTracksVersus.id,
      closingDate: nextTracksVersus.closingDate,
      firstTrackScore: nextTracksVersus.firstTrackScore,
      specialLikeFirstTrack: nextTracksVersus.specialLikeFirstTrack,
      secondTrackScore: nextTracksVersus.secondTrackScore,
      specialLikeSecondTrack: nextTracksVersus.specialLikeSecondTrack,
      firstTrack: mapTrack(
        nextTracksVersus.firstTrack,
        firstUser,
        nbLikesOfFirstTrack.length,
        firstTrackIsLikedByUser
      ),
      secondTrack: mapTrack(
        nextTracksVersus.secondTrack,
        secondUser,
        nbLikesOfSecondTrack.length,
        secondTrackIsLikedByUser
      ),
    }

    return tracksVersusBroadcasted
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
    const winnerTrack: WinnerTrack = {
      trackId: null,
      userId: '',
      score: 0,
      specialScore: 0,
      spotifyTrackId: '',
    }

    const assignWinner = (
      trackId: string | null,
      userId: string | null,
      score: number,
      specialScore: number
    ) => {
      tracksVersus.status = TracksVersusStatus.CompletedVotes
      tracksVersus.trackWinner = trackId
      tracksVersus.UserWinner = userId

      winnerTrack.trackId = trackId
      winnerTrack.userId = userId ?? ''
      winnerTrack.score = score
      winnerTrack.specialScore = specialScore
    }

    const {
      specialLikeFirstTrack,
      specialLikeSecondTrack,
      firstTrackScore,
      secondTrackScore,
      firstTrackId,
      secondTrackId,
      firstTrackUser,
      secondTrackUser,
    } = tracksVersus

    if (specialLikeFirstTrack > specialLikeSecondTrack) {
      assignWinner(
        firstTrackId,
        firstTrackUser,
        specialLikeFirstTrack * 10 + firstTrackScore,
        specialLikeFirstTrack
      )
    } else if (specialLikeFirstTrack < specialLikeSecondTrack) {
      assignWinner(
        secondTrackId,
        secondTrackUser,
        specialLikeSecondTrack * 10 + secondTrackScore,
        specialLikeSecondTrack
      )
    } else if (firstTrackScore > secondTrackScore) {
      assignWinner(firstTrackId, firstTrackUser, firstTrackScore, 0)
    } else if (firstTrackScore < secondTrackScore) {
      assignWinner(secondTrackId, secondTrackUser, secondTrackScore, 0)
    } else {
      // Égalité parfaite
      tracksVersus.status = TracksVersusStatus.CompletedVotes
    }

    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    const track = await Track.findBy('id', winnerTrack.trackId)
    winnerTrack.spotifyTrackId = track?.spotifyTrackId ?? ''

    return winnerTrack
  }

  static async likeTrack(
    tracksVersus: TracksVersus,
    trackId: string,
    currentUserId: string,
    targetTrack: number,
    trx: TransactionClientContract
  ): Promise<void> {
    if (targetTrack === 1) tracksVersus.firstTrackScore += 10
    if (targetTrack === 2) tracksVersus.secondTrackScore += 10
    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    const like = new LikeTrack()
    like.userId = currentUserId
    like.trackId = trackId
    like.tracksVersusId = tracksVersus.id
    like.useTransaction(trx)
    await like.save()
  }

  static async SpecialLikeTrack(
    tracksVersus: TracksVersus,
    user: User,
    targetTrack: number,
    amount: number,
    trx: TransactionClientContract
  ): Promise<User> {
    if (targetTrack === 1) tracksVersus.specialLikeFirstTrack += amount
    if (targetTrack === 2) tracksVersus.specialLikeSecondTrack += amount
    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    await User.query({ client: trx })
      .where('id', user.id)
      .update({
        amountVirtualCurrency: user.amountVirtualCurrency - amount,
      })

    return user
  }

  static async createTracksVersusCommand(
    trx: TransactionClientContract,
    playlistId: string,
    firstTrack: Track,
    secondTrack: Track,
    firstUser: User,
    secondUser: User,
    status: TracksVersusStatus
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
    newVersus.closingDate = DateTime.now().plus({ seconds: 30 })
    newVersus.useTransaction(trx)
    await newVersus.save()

    return newVersus
  }
}
