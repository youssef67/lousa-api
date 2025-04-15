export interface UserSession {
  id: string
  userName?: string
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  role: string
  amountVirtualCurrency: number
  victoryPoints: number
  twitchUser?: TwitchUserSession
  spotifyUser?: SpotifyUserSession
}

export interface UserNameAndId {
  id: string
  userName?: string
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
