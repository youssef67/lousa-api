import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'smtp',

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    brevo: transports.brevo({
      key: env.get('BREVO_API_KEY'),
      baseUrl: 'https://api.brevo.com/v3',
    }),
    smtp: transports.smtp({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        type: 'login',
        user: '802eb3001@smtp-brevo.com',
        pass: 'F2KtHGsEyrzN6SaL',
      },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
