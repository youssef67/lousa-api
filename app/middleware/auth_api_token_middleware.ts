import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApiError from '#types/api_error'
import Device from '#models/device'
import { validate as isUuid } from 'uuid'
import { unsign } from 'cookie-signature'
import env from '#start/env'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    currentDevice: Device
  }
}

export default class AuthApiTokenMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const deviceId = unsign(request.header('x-d-i')?.slice(2) || '', env.get('COOKIE_SECRET')) // x-d-i stands for device id
    const accessToken = unsign(request.header('x-d-a')?.slice(2) || '', env.get('COOKIE_SECRET')) // x-d-a stands for access token

    console.log()
    if (!deviceId || !isUuid(deviceId)) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHT-1')
      return response.unprocessableEntity(apiError.toJson())
    }
    if (!accessToken) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHT-2')
      return response.unprocessableEntity(apiError.toJson())
    }

    const device = await Device.find(deviceId)

    if (!device) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHT-3')
      return response.unprocessableEntity(apiError.toJson())
    }

    if (device.accessToken !== accessToken) {
      const apiError = new ApiError('Invalid data', 'ERROR_INVALID_DATA', 'ATHT-4')
      return response.unprocessableEntity(apiError.toJson())
    }

    HttpContext.getter('currentDevice', function (this: HttpContext) {
      return device
    })

    await next()
  }
}
