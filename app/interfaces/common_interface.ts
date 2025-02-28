export interface UserSession {
  id: string
  userName?: string
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  role: string
  twitchUser?: TwitchUserSession
  spotifyUser?: SpotifyUserSession
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

export interface StreamerSpaceSession {
  id: string
  spaceName: string
}
