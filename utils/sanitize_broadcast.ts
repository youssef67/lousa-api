import { UserSession } from '#interfaces/common_interface'
import {
  BroadcasterTrack,
  BroadcasterVersus,
  ScoreAndLikes,
  VersusTrack,
} from '#interfaces/playlist_interface'
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
    specialScore: track.specialScore,
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
export function sanitizeTracksVersus(tracksVersus: BroadcasterVersus | null) {
  let closingDateToISO: string | null = null

  const rawDate = tracksVersus?.closingDate

  if (rawDate) {
    if (typeof rawDate === 'string') {
      const dt = DateTime.fromISO(rawDate)
      closingDateToISO = dt.isValid ? dt.toISO() : null
    } else if (rawDate instanceof Date) {
      const dt = DateTime.fromJSDate(rawDate)
      closingDateToISO = dt.isValid ? dt.toISO() : null
    } else if ('toISO' in rawDate && typeof rawDate.toISO === 'function') {
      // Probablement déjà un DateTime Luxon
      closingDateToISO = rawDate.toISO()
    }
  }

  return {
    id: tracksVersus?.id ?? null,
    closingDate: closingDateToISO,
    firstTrack: sanitizeTrack(tracksVersus?.firstTrack ?? null),
    secondTrack: sanitizeTrack(tracksVersus?.secondTrack ?? null),
  }
}

export function sanitizeTrack(track: VersusTrack | null) {
  if (!track) return null

  return {
    trackId: track.trackId,
    spotifyTrackId: track.spotifyTrackId,
    trackName: track.trackName,
    artistName: track.artistName,
    album: track.album,
    cover: track.cover,
    url: track.url,
    scoreAndLikes: sanitizeScoreAndLikes(track.scoreAndLikes),
    user: {
      id: track.user.id,
      userName: track.user.userName ?? null,
      amountVirtualCurrency: track.user.amountVirtualCurrency,
    },
  }
}

export function sanitizeScoreAndLikes(score: ScoreAndLikes | null) {
  if (!score) return null

  return {
    trackScore: score.trackScore,
    alreadyLiked: score.alreadyLiked,
    specialLike: score.specialLike,
    nbLikes: score.nbLikes,
  }
}

export function sanitizeUser(user: UserSession): Record<string, string | number | null> {
  return {
    id: user.id,
    userName: user.userName ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    email: user.email ?? null,
    dateOfBirth: user.dateOfBirth ?? null,
    role: user.role,
    amountVirtualCurrency: user.amountVirtualCurrency,
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
