import queue from '@rlanz/bull-queue/services/main'
import RegisterWinnerJob from '../jobs/register_winner_job.js'
import TracksVersus from '#models/tracks_versus'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export default class JobsService {
  static async setRegisterWinnerJob(id: string, trx: TransactionClientContract) {
    const tracksVersus = await TracksVersus.query({ client: trx }).where('id', id).first()

    if (!tracksVersus) {
      throw new Error('TracksVersus not found')
    }

    try {
      const closingDate = DateTime.fromJSDate(tracksVersus.closingDate as unknown as Date)
      const now = DateTime.utc()
      const delay = closingDate.diff(now).as('milliseconds')

      if (delay <= 0) {
        console.warn('Job is already expired, not scheduling it.')
      }

      queue.dispatch(
        RegisterWinnerJob,
        { tracksVersusId: id },
        {
          delay: Math.max(0, delay),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      )

      console.log(`🎯 Job RegisterWinner planifié dans ${Math.max(0, delay)}ms`)
    } catch (error) {
      console.error('Error in setRegisterWinnerJob:', error)
      throw error
    }
  }
}
