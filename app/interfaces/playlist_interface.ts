import { DateTime } from 'luxon'
import { UserSession } from './common_interface.js'
import TracksVersus from '#models/tracks_versus'

export interface VersusTracksSession {
  id: string
  firstTrack: any
  secondTrack: any
}

export interface PlaylistTrackSerialized {
  id: string
  trackId: string
  vote: number
  position: number
  score: number
  specialScore: number
  user: UserSession
}

export interface PendingTrackSerialized {
  pendingTrackId: string
  trackId: string
  user: UserSession
}

export interface DataTrack {
  trackId?: string
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
}

export interface WinnerTrack {
  tracksVersusId: string
  trackId: string
  userId: string
  score: number
  specialScore: number
}

export interface RegisterWinnerResult {
  winnerTrack: WinnerTrack
  nextTracksVersus: TracksVersus | null
}

export interface BroadcasterTrack {
  id: string
  spotifyTrackId: string
  trackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
  vote: number
  position: number
  score: number
  specialScore: number
  user: UserSession
}

export interface BroadcasterVersus {
  id: string | null
  closingDate: DateTime | null
  firstTrack: VersusTrack | null
  secondTrack: VersusTrack | null
}

export interface ScoreAndLikes {
  trackScore: number | null
  alreadyLiked: boolean
  specialLike: number | null
  nbLikes: number
}

export interface VersusTrack {
  trackId: string
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
  scoreAndLikes: ScoreAndLikes | null
  user: {
    id: string
    userName?: string | null
    amountVirtualCurrency: number
  }
}

export interface UserFromTrack {
  user: UserSession
}
