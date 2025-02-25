export interface PlaylistTrackSession {
  id: string
  trackId: string
  vote: number
  position: number
}

export interface TrackSession {
  spotifyTrackId: string
  trackName: string
  artistName: string
  album: string
  cover: string
  url: string
}
