import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'
import ApiError from '#types/api_error'

export default class AuthApiKeyMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const apiKey = request.header('x-a-k')

    if (!apiKey) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHK-1')

      return response.unprocessableEntity(apiError.toJson())
    }

    const validApiKey = env.get('API_KEY')

    if (apiKey !== validApiKey) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHK-2')

      return response.unprocessableEntity(apiError.toJson())
    }

    await next()
  }
}
