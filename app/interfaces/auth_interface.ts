import { UserSession } from './common_interface.js'

export interface AuthSignupAnonymousResponse {
  rt: string
  at: string
  di: string
  user: UserSession
}

export interface AuthSignupEmailResponse {
  authId: string
}

export interface AuthSignupEmailConfirmResponse {
  user: UserSession
}

export interface AuthLoginEmailResponse {
  authId: string
}

export interface AuthLoginEmailConfirmResponse {
  rt: string
  at: string
  di: string
  user: UserSession
}

export interface AuthLoginSpotifyResponse {
  url: string
}
