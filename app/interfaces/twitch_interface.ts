export interface RefreshTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface PlaylistSession {
  id: string
  playlistName: string
}

export interface StreamerSerialized {
  id: string
  userLogin: string
  userName: string
  thumbnailUrl: string
}
