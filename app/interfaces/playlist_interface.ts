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
  user: UserSession
}

export interface BroadcasterVersus {
  id: string
  closingDate: DateTime
  firstTrackScore: number
  secondTrackScore: number
  firstTrack: VersusTrack | null
  secondTrack: VersusTrack | null
}

export interface VersusTrack {
  trackId: string
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
  user: {
    id: string
    userName?: string | null
  }
}

export interface UserFromTrack {
  user: UserSession
}
