import { BroadcasterVersus, WinnerTrack } from '#interfaces/playlist_interface'
import LikeTrack from '#models/like_track'
import Track from '#models/track'
import TracksVersus from '#models/tracks_versus'
import User from '#models/user'
import ApiError from '#types/api_error'
import { TracksVersusStatus } from '#types/versus.status'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { RegisterWinnerResult } from '#interfaces/playlist_interface'
import JobsService from './jobs_service.js'
import db from '@adonisjs/lucid/services/db'
import { spec } from 'node:test/reporters'
import PlaylistTrack from '#models/playlist_track'
import { TrackStatus } from '#types/track_status'

export default class VersusService {
  static async validateAndGetVersus(id: string) {
    const versus = await TracksVersus.findBy('id', id)
    if (!versus) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'STV-1')
    }

    if (versus.trackWinner) {
      return null
    }

    return versus
  }

  static async createOrUpdateTracksVersus(
    track: Track,
    playlistId: string,
    userId: string,
    trx: TransactionClientContract
  ): Promise<TracksVersus> {
    let lastVersusRecorded: TracksVersus | null = null

    // On recupère le tracksVersus enregistré le plus ancien
    lastVersusRecorded = await TracksVersus.query()
      .where('playlist_id', playlistId)
      .orderBy('created_at', 'desc')
      .first()

    // Le dernier tracksVersus enregistré est en attente d'une musique, on va le compléter
    if (lastVersusRecorded?.status === TracksVersusStatus.MissingTracks) {
      if (lastVersusRecorded.firstTrackUser === userId) {
        console.log('Le user a déjà soumis une musique sur ce tracksVersus')
        throw ApiError.newError('ERROR_INVALID_DATA', 'SVTCUCT-1')
      }

      const existingActiveVersus = await TracksVersus.query()
        .where('playlist_id', playlistId)
        .whereIn('status', [TracksVersusStatus.VotingProgress, TracksVersusStatus.OnHold])
        .first()

      lastVersusRecorded.secondTrackId = track.id
      lastVersusRecorded.secondTrackUser = userId
      lastVersusRecorded.status = existingActiveVersus
        ? TracksVersusStatus.OnHold
        : TracksVersusStatus.VotingProgress
      lastVersusRecorded.closingDate = existingActiveVersus
        ? null
        : DateTime.now().plus({ seconds: 90 })
      lastVersusRecorded.useTransaction(trx)
      await lastVersusRecorded.save()
      // Le dernier tracksVersus n'existe pas ou a un statut indiquant qu'il est soit en cours de votes, soit en attente, soit terminé
      // Dans ce cas, on va créer un nouveau tracksVersus
    } else {
      lastVersusRecorded = new TracksVersus()
      lastVersusRecorded.playlistId = playlistId
      lastVersusRecorded.firstTrackId = track.id
      lastVersusRecorded.firstTrackUser = userId
      lastVersusRecorded.secondTrackId = null
      lastVersusRecorded.firstTrackScore = 0
      lastVersusRecorded.secondTrackScore = 0
      lastVersusRecorded.status = TracksVersusStatus.MissingTracks
      lastVersusRecorded.useTransaction(trx)
      await lastVersusRecorded.save()
    }

    return lastVersusRecorded
  }

  static async tracksVersusBroadcasted(
    tracksVersus: TracksVersus | null,
    userId: string | null
  ): Promise<BroadcasterVersus> {
    if (!tracksVersus) {
      return {} as BroadcasterVersus
    }

    // Chargement des users liés
    const [firstUser, secondUser] = await Promise.all([
      tracksVersus?.firstTrackUser ? User.findBy('id', tracksVersus.firstTrackUser) : null,
      tracksVersus?.secondTrackUser ? User.findBy('id', tracksVersus.secondTrackUser) : null,
    ])

    let nbLikesUserIdOfFirstTrack: string[] = []
    let nbLikesUserIdOfSecondTrack: string[] = []
    if (tracksVersus?.likeTracks && userId) {
      const nbLikesOfFirstTrack = tracksVersus.likeTracks.filter(
        (like) => like.trackId === tracksVersus.firstTrackId
      )

      nbLikesUserIdOfFirstTrack = nbLikesOfFirstTrack.map((like) => like.userId)

      const nbLikesOfSecondTrack = tracksVersus.likeTracks.filter(
        (like) => like.trackId === tracksVersus.secondTrackId
      )

      nbLikesUserIdOfSecondTrack = nbLikesOfSecondTrack.map((like) => like.userId)
    }

    const mapTrack = (
      track: Track | null,
      user: User | null,
      userIdList: string[],
      score: number,
      specialLike: number
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
        scoreAndLikes: {
          trackScore: score,
          specialLike: specialLike,
          listOfUserIdWhoLiked: userIdList,
        },
        user: {
          id: user?.id ?? 'unknown',
          userName: user?.userName ?? null,
          amountVirtualCurrency: user?.amountVirtualCurrency ?? 0,
        },
      }
    }

    const tracksVersusBroadcasted: BroadcasterVersus = {
      id: tracksVersus?.id || null,
      closingDate: tracksVersus?.closingDate || null,
      firstTrack: tracksVersus?.firstTrack
        ? mapTrack(
            tracksVersus.firstTrack,
            firstUser,
            nbLikesUserIdOfFirstTrack,
            tracksVersus.firstTrackScore,
            tracksVersus.specialLikeFirstTrack
          )
        : null,
      secondTrack: tracksVersus?.secondTrack
        ? mapTrack(
            tracksVersus.secondTrack,
            secondUser,
            nbLikesUserIdOfSecondTrack,
            tracksVersus.secondTrackScore,
            tracksVersus.specialLikeSecondTrack
          )
        : null,
      isComplete: tracksVersus?.secondTrack !== null,
    }

    return tracksVersusBroadcasted
  }

  static async activationTracksVersus(
    playlistId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const tracksVersusToBeActivated = await TracksVersus.query({ client: trx })
      .where('playlist_id', playlistId)
      .andWhere('status', TracksVersusStatus.OnHold)
      .preload('firstTrack')
      .preload('secondTrack')
      .orderBy('created_at', 'asc')
      .first()

    if (tracksVersusToBeActivated) {
      tracksVersusToBeActivated.status = TracksVersusStatus.VotingProgress
      tracksVersusToBeActivated.closingDate = DateTime.now().plus({ seconds: 90 })
      tracksVersusToBeActivated.useTransaction(trx)
      await tracksVersusToBeActivated.save()
    }
  }

  static async registerWinner(
    tracksVersus: TracksVersus,
    trx: TransactionClientContract
  ): Promise<RegisterWinnerResult> {
    const { specialLikeFirstTrack, specialLikeSecondTrack, secondTrackId } = tracksVersus

    let winnerTrack: WinnerTrack = {} as WinnerTrack
    if (!secondTrackId) {
      console.log('registerWinnerInCaseOneTrackMissing')
      winnerTrack = await this.registerWinnerInCaseOneTrackMissing(tracksVersus, trx)
    } else if (specialLikeFirstTrack > 0 || specialLikeSecondTrack > 0) {
      console.log('registerWinnerInCaseSpecialLike')
      winnerTrack = await this.registerWinnerInCaseSpecialLike(tracksVersus, trx)
    } else {
      console.log('registerWinnerInCaseSimpleLike')
      winnerTrack = await this.registerWinnerInCaseSimpleLike(tracksVersus, trx)
    }

    const nextTracksVersus = await this.setNextTracksVersus(tracksVersus.playlistId, trx)

    if (nextTracksVersus) {
      await JobsService.setRegisterWinnerJob(nextTracksVersus.id, trx)
    }

    return { winnerTrack, nextTracksVersus }
  }

  static async setNextTracksVersus(
    playlistId: string,
    trx: TransactionClientContract
  ): Promise<TracksVersus | null> {
    const nextTracksVersus = await TracksVersus.query({ client: trx })
      .where('status', TracksVersusStatus.OnHold)
      .andWhere('playlist_id', playlistId)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .orderBy('created_at', 'asc')
      .first()

    if (nextTracksVersus) {
      nextTracksVersus.status = TracksVersusStatus.VotingProgress
      nextTracksVersus.closingDate = DateTime.now().plus({ seconds: 90 })
      nextTracksVersus.useTransaction(trx)
      await nextTracksVersus.save()
    }

    return nextTracksVersus
  }

  static async registerWinnerInCaseOneTrackMissing(
    tracksVersus: TracksVersus,
    trx: TransactionClientContract
  ): Promise<WinnerTrack> {
    let winnerTrack: WinnerTrack = {} as WinnerTrack

    winnerTrack = await this.assignWinner(
      tracksVersus.id!,
      tracksVersus.firstTrackId!,
      tracksVersus.firstTrackUser!,
      tracksVersus.firstTrackScore,
      tracksVersus.specialLikeFirstTrack
    )

    await this.TracksVersusUpdate(winnerTrack, trx)

    return winnerTrack
  }

  static async registerWinnerInCaseSpecialLike(
    tracksVersus: TracksVersus,
    trx: TransactionClientContract
  ): Promise<WinnerTrack> {
    // On vérifie si les 2 special like sont différents, ce qui implique un gangnant
    let winnerTrack: WinnerTrack = {} as WinnerTrack
    if (tracksVersus.specialLikeFirstTrack !== tracksVersus.specialLikeSecondTrack) {
      if (tracksVersus.specialLikeFirstTrack > tracksVersus.specialLikeSecondTrack) {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.firstTrackId!,
          tracksVersus.firstTrackUser!,
          tracksVersus.firstTrackScore,
          tracksVersus.specialLikeFirstTrack
        )
      } else {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.secondTrackId!,
          tracksVersus.secondTrackUser!,
          tracksVersus.secondTrackScore,
          tracksVersus.specialLikeSecondTrack
        )
      }

      await this.TracksVersusUpdate(winnerTrack, trx)
      // Si les 2 special like sont égaux, on vérifie le score et si ils sont différents, on prend le gagnant
    } else if (
      tracksVersus.specialLikeFirstTrack === tracksVersus.specialLikeSecondTrack &&
      tracksVersus.firstTrackScore !== tracksVersus.secondTrackScore
    ) {
      if (tracksVersus.firstTrackScore > tracksVersus.secondTrackScore) {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.firstTrackId!,
          tracksVersus.firstTrackUser!,
          tracksVersus.firstTrackScore,
          tracksVersus.specialLikeFirstTrack
        )
      } else {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.secondTrackId!,
          tracksVersus.secondTrackUser!,
          tracksVersus.secondTrackScore,
          tracksVersus.specialLikeSecondTrack
        )
      }

      await this.TracksVersusUpdate(winnerTrack, trx)
      // Le cas écheant, on prend la 1ere track soumise, soit la 1ere musique
    } else {
      winnerTrack = await this.assignWinner(
        tracksVersus.id!,
        tracksVersus.firstTrackId!,
        tracksVersus.firstTrackUser!,
        tracksVersus.firstTrackScore,
        tracksVersus.specialLikeFirstTrack
      )

      await this.TracksVersusUpdate(winnerTrack, trx)
    }

    tracksVersus.status = TracksVersusStatus.CompletedVotes
    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    return winnerTrack
  }

  // Vainqueur selon le nombre de like simple
  static async registerWinnerInCaseSimpleLike(
    tracksVersus: TracksVersus,
    trx: TransactionClientContract
  ): Promise<WinnerTrack> {
    // on vérifie le nombre de like simple
    let winnerTrack: WinnerTrack = {} as WinnerTrack
    if (tracksVersus.firstTrackScore !== tracksVersus.secondTrackScore) {
      if (tracksVersus.firstTrackScore > tracksVersus.secondTrackScore) {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.firstTrackId!,
          tracksVersus.firstTrackUser!,
          tracksVersus.firstTrackScore,
          tracksVersus.specialLikeFirstTrack
        )
      } else {
        winnerTrack = await this.assignWinner(
          tracksVersus.id!,
          tracksVersus.secondTrackId!,
          tracksVersus.secondTrackUser!,
          tracksVersus.secondTrackScore,
          tracksVersus.specialLikeSecondTrack
        )
      }

      await this.TracksVersusUpdate(winnerTrack, trx)
      // Si les 2 like sont égaux, on choisi la 1er track
    } else {
      winnerTrack = await this.assignWinner(
        tracksVersus.id!,
        tracksVersus.firstTrackId!,
        tracksVersus.firstTrackUser!,
        tracksVersus.firstTrackScore,
        tracksVersus.specialLikeFirstTrack
      )

      await this.TracksVersusUpdate(winnerTrack, trx)
    }

    tracksVersus.status = TracksVersusStatus.CompletedVotes
    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    return winnerTrack
  }

  static async assignWinner(
    tracksVersusId: string,
    trackId: string,
    userId: string,
    score: number,
    specialScore: number
  ): Promise<WinnerTrack> {
    let data: WinnerTrack = {
      tracksVersusId: '',
      trackId: '',
      userId: '',
      score: 0,
      specialScore: 0,
    }

    data.tracksVersusId = tracksVersusId
    data.trackId = trackId
    data.userId = userId ?? ''
    data.score = score
    data.specialScore = specialScore

    return data
  }

  static async TracksVersusUpdate(winner: WinnerTrack, trx: TransactionClientContract) {
    await TracksVersus.query({ client: trx })
      .update({
        trackWinner: winner.trackId,
        userWinner: winner.userId,
      })
      .where('id', winner.tracksVersusId)
  }

  static async likeTrack(
    tracksVersusId: string,
    trackId: string,
    currentUserId: string,
    targetTrack: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const tracksVersus = await this.checkIfTracksVersusExist(tracksVersusId, trx)

    if (!tracksVersus) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SLT-1')
    }

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

  static async checkIfTracksVersusExist(
    tracksVersusId: string,
    trx: TransactionClientContract
  ): Promise<TracksVersus | null> {
    const tracksVersus = await TracksVersus.query({ client: trx })
      .where('id', tracksVersusId)
      .preload('firstTrack')
      .preload('secondTrack')
      .preload('likeTracks')
      .first()

    return tracksVersus
  }

  static async SpecialLikeTrack(
    tracksVersusId: string,
    user: User,
    targetTrack: number,
    amount: number,
    trx: TransactionClientContract
  ): Promise<User> {
    const tracksVersus = await this.checkIfTracksVersusExist(tracksVersusId, trx)

    if (!tracksVersus) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SSLT-1')
    }

    const userWhoSpendVirtualCurrency = await User.query({ client: trx })
      .where('id', user.id)
      .first()

    if (!userWhoSpendVirtualCurrency) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SSLT-2')
    }

    if (userWhoSpendVirtualCurrency.amountVirtualCurrency < amount) {
      throw ApiError.newError('ERROR_INVALID_DATA', 'SSLT-3')
    }

    if (targetTrack === 1) tracksVersus.specialLikeFirstTrack += amount
    if (targetTrack === 2) tracksVersus.specialLikeSecondTrack += amount
    tracksVersus.useTransaction(trx)
    await tracksVersus.save()

    userWhoSpendVirtualCurrency.amountVirtualCurrency -= amount
    userWhoSpendVirtualCurrency.useTransaction(trx)
    await userWhoSpendVirtualCurrency.save()

    // await User.query({ client: trx })
    //   .where('id', user.id)
    //   .update({
    //     amountVirtualCurrency: user.amountVirtualCurrency - amount,
    //   })

    return userWhoSpendVirtualCurrency
  }

  static async createTracksVersusCommand(
    trx: TransactionClientContract,
    playlistId: string,
    firstTrack: Track,
    secondTrack: Track,
    firstUser: User,
    secondUser: User,
    status: TracksVersusStatus
  ): Promise<TracksVersus | null> {
    const trackAlreadyOnPlaylist = await PlaylistTrack.query()
      .where('id', playlistId)
      .andWhere((query) => {
        query.where('track_id', firstTrack.id).orWhere('track_id', secondTrack.id)
      })
      .first()

    if (!trackAlreadyOnPlaylist) {
      const newVersus = new TracksVersus()
      newVersus.playlistId = playlistId
      newVersus.firstTrackId = firstTrack.id
      newVersus.secondTrackId = secondTrack.id
      newVersus.firstTrackScore = 0
      newVersus.firstTrackUser = firstUser.id
      newVersus.secondTrackScore = 0
      newVersus.secondTrackUser = secondUser.id
      newVersus.status = status
      newVersus.closingDate =
        status === TracksVersusStatus.VotingProgress ? DateTime.now().plus({ seconds: 90 }) : null
      newVersus.useTransaction(trx)
      await newVersus.save()

      if (status === TracksVersusStatus.VotingProgress) {
        await JobsService.setRegisterWinnerJob(newVersus.id, trx)
      }

      return newVersus
    } else {
      return null
    }
  }
}
