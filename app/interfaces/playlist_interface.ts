import { DateTime } from 'luxon'
import { UserSession } from './common_interface.js'

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
  trackId: string | null
  userId: string
  score: number
  specialScore: number
  spotifyTrackId: string
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
  id: string
  closingDate: DateTime
  firstTrackScore: number
  specialLikeFirstTrack: number
  secondTrackScore: number
  specialLikeSecondTrack: number
  firstTrack: VersusTrack | null
  secondTrack: VersusTrack | null
}

export interface ScoreAndLikes {
  firstTrackScore: number
  firstTrackAlreadyLiked: boolean
  specialLikeFirstTrack: number
  secondTrackScore: number
  secondTrackAlreadyLiked: boolean
  specialLikeSecondTrack: number
  nbLikesFirstTrack: number
  nbLikesSecondTrack: number
}

export interface VersusTrack {
  trackId: string
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
  nbLikes: number
  isLikedByUser: boolean
  user: {
    id: string
    userName?: string | null
  }
}

export interface UserFromTrack {
  user: UserSession
}
