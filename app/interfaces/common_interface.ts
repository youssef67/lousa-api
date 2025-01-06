export interface UserSession {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  role: string
}

export interface SpotifyUserSession {
  id: string
  spotifyId: string
  displayName: string
  email?: string
  accessToken: string
  refreshToken: string
}
