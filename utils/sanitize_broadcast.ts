import { BroadcasterTrack } from '#interfaces/playlist_interface'

/**
 * Nettoie un objet PlaylistTrack pour qu'il soit compatible avec Transmit (Broadcastable)
 */
export function sanitizePlaylistTrack(track: BroadcasterTrack) {
  return {
    playlistTrackId: track.id,
    trackId: track.trackId,
    spotifyTrackId: track.spotifyTrackId,
    trackName: track.trackName,
    artistName: track.artistName,
    album: track.album,
    cover: track.cover,
    url: track.url,
    vote: track.vote,
    score: track.score,
    position: track.position,
    user: {
      id: track.user.id,
      userName: track.user.userName ?? null,
    },
  }
}

/**
 * Nettoie une liste de PlaylistTrack
 */
export function sanitizePlaylistTracks(tracks: BroadcasterTrack[]) {
  return tracks.map(sanitizePlaylistTrack)
}
