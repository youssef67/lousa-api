import type { HttpContext } from '@adonisjs/core/http'
import { completeProfileValidator } from '#validators/viewer'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

const completeProfile = async ({ response, request, currentDevice }: HttpContext) => {
  const payload = await request.validateUsing(completeProfileValidator)
  await currentDevice.load('user')
  const currentUser = currentDevice.user

  const user = await User.query().where('user_name', payload.userName).first()

  if (user) {
    return response.ok({ result: false })
  }

  await db.transaction(async (trx) => {
    currentUser.userName = payload.userName
    currentUser.useTransaction(trx)
    await currentUser.save()
  })

  return response.ok({ result: currentUser.serializeAsSession() })
}

export default completeProfile
