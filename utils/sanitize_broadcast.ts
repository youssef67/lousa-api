import { BroadcasterTrack, BroadcasterVersus, VersusTrack } from '#interfaces/playlist_interface'
import { DateTime } from 'luxon'

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
 * Nettoie un Versus pour broadcast (avec conversion de DateTime)
 */
export function sanitizeTracksVersus(versus: BroadcasterVersus) {
  const closingDate = DateTime.isDateTime(versus.closingDate)
    ? versus.closingDate
    : DateTime.fromISO(String(versus.closingDate))
  return {
    id: versus.id,
    closingDate: closingDate.toISO(),
    firstTrackScore: versus.firstTrackScore,
    secondTrackScore: versus.secondTrackScore,
    firstTrack: versus.firstTrack ? sanitizeVersusTrack(versus.firstTrack) : null,
    secondTrack: versus.secondTrack ? sanitizeVersusTrack(versus.secondTrack) : null,
  }
}

/**
 * Nettoie un track dans un Versus
 */
export function sanitizeVersusTrack(track: VersusTrack) {
  return {
    trackId: track.trackId,
    spotifyTrackId: track.spotifyTrackId,
    trackName: track.trackName,
    artistName: track.artistName,
    album: track.album,
    cover: track.cover,
    url: track.url,
    user: {
      id: track.user.id,
      userName: track.user.userName ?? null,
    },
  }
}

/**
 * Nettoie une liste de tracks
 */
export function sanitizePlaylistTracks(tracks: BroadcasterTrack[]) {
  return tracks.map(sanitizePlaylistTrack)
}
