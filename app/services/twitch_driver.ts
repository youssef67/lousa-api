/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| Make sure you through the code and comments properly and make necessary
| changes as per the requirements of your implementation.
|
*/

/**
|--------------------------------------------------------------------------
 *  Search keyword "TwitchDriver" and replace it with a meaningful name
|--------------------------------------------------------------------------
 */

import { Oauth2Driver, RedirectRequest } from '@adonisjs/ally'
import type { HttpContext } from '@adonisjs/core/http'
import { cryptoRandomString } from '#utils/random.utils'
import type { AllyDriverContract, AllyUserContract, ApiRequestContract } from '@adonisjs/ally/types'

/**
 *
 * Access token returned by your driver implementation. An access
 * token must have "token" and "type" properties and you may
 * define additional properties (if needed)
 */
export type TwitchDriverAccessToken = {
  token: string
  type: 'bearer'
}

/**
 * Scopes accepted by the driver implementation.
 */
export type TwitchDriverScopes = 'user:read:email'

/**
 * The configuration accepted by the driver implementation.
 */
export type TwitchDriverConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  state?: string
}

/**
 * Driver implementation. It is mostly configuration driven except the API call
 * to get user info.
 */
export class TwitchDriver
  extends Oauth2Driver<TwitchDriverAccessToken, TwitchDriverScopes>
  implements AllyDriverContract<TwitchDriverAccessToken, TwitchDriverScopes>
{
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://id.twitch.tv/oauth2/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://id.twitch.tv/oauth2/token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = 'https://api.twitch.tv/helix/users'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'twitch_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(
    ctx: HttpContext,
    public config: TwitchDriverConfig
  ) {
    super(ctx, config)
    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  protected loadState(): void {
    const existingState = this.ctx.request.encryptedCookie(this.stateCookieName)

    if (existingState) {
      this.stateCookieValue = existingState
    } else {
      const newState = cryptoRandomString({ length: 16, type: 'numeric' })
      this.stateCookieValue = newState

      this.ctx.response.encryptedCookie(this.stateCookieName, newState)
    }
  }

  // protected scopes: TwitchDriverScopes[] = ['user:read:email']
  /**
   * Optionally configure the authorization redirect request. The actual request
   * is made by the base implementation of "Oauth2" driver and this is a
   * hook to pre-configure the request.
   */
  protected configureRedirectRequest(request: RedirectRequest<TwitchDriverScopes>) {
    request.param(this.stateParamName, this.stateCookieValue)
  }

  /**
   * Optionally configure the access token request. The actual request is made by
   * the base implementation of "Oauth2" driver and this is a hook to pre-configure
   * the request
   */
  // protected configureAccessTokenRequest(request: ApiRequest) {}

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  public getStateStored(): string {
    return this.ctx.request.input(this.stateParamName)
  }
  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
  async user(
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<TwitchDriverAccessToken>> {
    const stateSent = this.ctx.request.input('state') // State reçu dans la requête
    const stateStored = this.ctx.request.encryptedCookie(this.stateCookieName) // State stocké dans le cookie

    if (stateSent !== stateStored) {
      throw new Error('State mismatch: possible CSRF attack')
    }

    const accessToken = await this.accessToken()
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)
    request.header('Authorization', `Bearer ${accessToken.token}`)
    request.header('Client-ID', this.config.clientId)
    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if needed)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    /**
     * Write your implementation details here.
     */
    // Envoyer la requête pour récupérer les informations utilisateur
    const userResponse = await request.get()

    let userResponseJson

    if (typeof userResponse === 'string') {
      userResponseJson = JSON.parse(userResponse)
    }
    const [userData] = userResponseJson.data
    return {
      id: userData.id,
      nickName: userData.login,
      name: userData.display_name,
      email: userData.email,
      avatarUrl: userData.profile_image_url,
      token: accessToken,
      original: userData,
      emailVerificationState: 'unsupported',
      state: stateStored,
    }
  }

  async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const stateStored = this.ctx.request.encryptedCookie(this.stateCookieName) // State stocké dans le cookie

    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Authorization', `Bearer ${accessToken}`)
    request.header('Client-ID', this.config.clientId)
    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if needed)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    /**
     * Write your implementation details here
     */
    const userResponse = await request.get()
    const [userData] = userResponse.data

    return {
      id: userData.id,
      nickName: userData.login,
      name: userData.display_name,
      email: userData.email,
      avatarUrl: userData.profile_image_url,
      token: { token: accessToken, type: 'bearer' },
      original: userData, // Toutes les données brutes reçues
      emailVerificationState: 'unsupported',
      state: stateStored,
    }
  }
}

/**
 * The factory function to reference the driver implementation
 * inside the "config/ally.ts" file.
 */
export function TwitchDriverService(
  config: TwitchDriverConfig
): (ctx: HttpContext) => TwitchDriver {
  return (ctx) => new TwitchDriver(ctx, config)
}
