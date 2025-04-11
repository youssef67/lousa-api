/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  COOKIE_SECRET: Env.schema.string(),
  SEE_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  HTTP_DEBUG: Env.schema.boolean(),
  APP_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  DB_DEBUG: Env.schema.boolean(),

  /*
  |----------------------------------------------------------
  | Other API variables
  |----------------------------------------------------------
  */
  API_LOG_FILE: Env.schema.string.optional(),
  API_ENV: Env.schema.enum(['development', 'staging', 'production', 'test'] as const),
  API_DRY_RUN_EMAIL: Env.schema.boolean(),
  API_DEBUG_VERIFICATION_CODE: Env.schema.string.optional(),
  AUTH_EMAIL_MAX_ATTEMPTS: Env.schema.number(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  BREVO_API_KEY: Env.schema.string(),
  BREVO_SMTP_USER: Env.schema.string(),
  BREVO_SMTP_PASS: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for API SPOTIFY
  |----------------------------------------------------------
  */
  SPOTIFY_CLIENT_ID: Env.schema.string(),
  SPOTIFY_CLIENT_SECRET: Env.schema.string(),
  SPOTIFY_REDIRECT_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for API TWITCH
  |----------------------------------------------------------
  */
  TWITCH_CLIENT_ID: Env.schema.string(),
  TWITCH_CLIENT_SECRET: Env.schema.string(),
  TWITCH_REDIRECT_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for @rlanz/bull-queue
  |----------------------------------------------------------
  */
  QUEUE_REDIS_HOST: Env.schema.string({ format: 'host' }),
  QUEUE_REDIS_PORT: Env.schema.number(),
  QUEUE_REDIS_PASSWORD: Env.schema.string.optional()
})
