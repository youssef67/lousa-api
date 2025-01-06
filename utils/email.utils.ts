import loggerW from '#config/winston_logger'
import env from '#start/env'
import mail from '@adonisjs/mail/services/main'

export type EmailData = {
  toEmail: string
  fromEmail: string
  subject: string
  values: {}
  ccEmail?: string[]
  pathEmailTemplate: string
}

export const sendEmail = async (data: EmailData) => {
  if (env.get('API_DRY_RUN_EMAIL', false)) {
    loggerW.info('DRY RUN EMAIL')
    return false
  }

  loggerW.debug('=> SEND EMAIL', data)

  return await mail.send((message) => {
    message
      .to(data.toEmail)
      .cc(data.ccEmail || [])
      .from(data.fromEmail)
      .subject(data.subject)
      .htmlView(data.pathEmailTemplate, data.values)
  })
}
