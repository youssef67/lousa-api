export interface UserSession {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  role: string
  twitchUser?: TwitchUserSession
}

export interface SpotifyUserSession {
  id: string
  spotifyId: string
  displayName: string
  email?: string
  accessToken: string
  refreshToken: string
}

export interface TwitchUserSession {
  id: string
  displayName: string
  email: string
}
