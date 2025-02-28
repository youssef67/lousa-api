import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

const checkUserNameAvailability = async ({ response, request }: HttpContext) => {
  const userName = request.input('userName')

  const user = await User.query().where('user_name', userName).first()

  if (user) {
    return response.ok({ result: false })
  }

  return response.ok({ result: true })
}

export default checkUserNameAvailability
