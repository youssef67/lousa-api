import { UserSession, SpotifyUserSession } from './common_interface.js'

export interface SessionGetUserSessionResponse {
  user: UserSession
  spotifyUser?: SpotifyUserSession
}

export interface SessionEditUserResponse {
  user: UserSession
}
