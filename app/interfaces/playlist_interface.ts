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

export interface TrackSerialized {
  trackId: string
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
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

export interface UserFromTrack {
  user: UserSession
}
