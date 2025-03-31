import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import TracksVersus from '#models/tracks_versus'
import { TracksVersusStatus } from '#types/versus.status'
import LikeTrack from '#models/like_track'

export default class LikesGenerate extends BaseCommand {
  static commandName = 'likes:generate'
  static description = 'Generate likes'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      this.logger.info(`Generating lies ...`)

      await this.cleanOldData()
      await this.createLikes()
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate likes: ${error.message}`)
    }
  }

  async cleanOldData() {
    await LikeTrack.query().delete()
  }

  async createLikes() {
    const tracksVersusExisting = await TracksVersus.query()
      .where('status', TracksVersusStatus.VotingProgress)
      .first()

    if (!tracksVersusExisting) {
      this.logger.info(`No tracks versus found`)
      return
    }

    const users = await User.query().whereLike('email', '%viewer%')

    if (users.length === 0) {
      this.logger.info(`No users found`)
      return
    }

    const { B: usersForFirstTrack, C: usersForSecondTrack } =
      await this.splitRandomNonOverlapping(users)

    await TracksVersus.query()
      .where('id', tracksVersusExisting.id)
      .update({
        first_track_score: usersForFirstTrack.length * 10,
        second_track_score: usersForSecondTrack.length * 10,
      })

    for (const user of usersForFirstTrack) {
      await LikeTrack.create({
        userId: user.id,
        trackId: tracksVersusExisting.firstTrackId,
        tracksVersusId: tracksVersusExisting.id,
      })
    }

    for (const user of usersForSecondTrack) {
      await LikeTrack.create({
        userId: user.id,
        trackId: tracksVersusExisting.secondTrackId,
        tracksVersusId: tracksVersusExisting.id,
      })
    }
  }

  async splitRandomNonOverlapping<T>(array: T[]): Promise<{ B: T[]; C: T[] }> {
    const shuffled = [...array].sort(() => Math.random() - 0.5)

    const maxB = Math.floor(Math.random() * array.length) // ex: 0 à 19
    const maxC = Math.floor(Math.random() * (array.length - maxB)) // reste dispo

    const B = shuffled.slice(0, maxB)
    const C = shuffled.slice(maxB, maxB + maxC)

    return { B, C }
  }
}
