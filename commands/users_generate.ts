import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { UserRole } from '#types/user_role'
import { randomUUID } from 'node:crypto'
import { generateToken } from '#utils/authentication.utils'
import { DateTime } from 'luxon'
import { streamersList } from '#data/streamers_list'
import User from '#models/user'
import TwitchStream from '../app/models/twitch_stream.js'
import { ModelStatus } from '#types/model_status'

export default class UsersGenerate extends BaseCommand {
  static commandName = 'users:generate'
  static description = 'Generate a specified number of users'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description: 'Number of users to generate',
    required: true,
  })
  declare numberViewer?: string

  @args.string({
    description: 'Number of streamer to generate',
    required: true,
  })
  declare numberStreamer?: string

  async run() {
    const numUsers = Number.parseInt(this.numberViewer!)
    if (Number.isNaN(numUsers) || numUsers <= 0) {
      this.logger.error('Please provide a valid positive number for user.')
      return
    }

    const numStreamer = Number.parseInt(this.numberStreamer!)
    if (Number.isNaN(numStreamer) || numStreamer <= 0) {
      this.logger.error('Please provide a valid positive number for streamer.')
      return
    }

    try {
      this.logger.info(`Generating ${numUsers} users...`)

      await this.cleanOldData()
      await this.createAdminUser()
      await this.createStreamersList()

      const users = await this.createUsers()

      await this.setUsersStreamerProfile()
      this.logger.success(`Successfully generated ${users.length} users!`)
    } catch (error) {
      console.error(error) // Log the full error
      this.logger.error(`Failed to generate users: ${error.message}`)
    }
  }

  // Utility function to load the user factory
  private async getUserFactory() {
    const userFactoryModule = await import('../database/factories/user_factory.js')
    return userFactoryModule.UserFactory
  }

  private async getDeviceFactory() {
    const deviceFactoryModule = await import('../database/factories/device_factory.js')
    return deviceFactoryModule.DeviceFactory
  }

  private async getTwitchStreamsFactory() {
    const twitchStreamsFactoryModule = await import(
      '../database/factories/twitch_stream_factory.js'
    )
    return twitchStreamsFactoryModule.TwitchStreamFactory
  }

  private async getTwitchUsersFactory() {
    const twitchUsersFactoryModule = await import('../database/factories/twitch_user_factory.js')
    return twitchUsersFactoryModule.TwitchUserFactory
  }

  async cleanOldData() {
    const UserModel = await import('../app/models/user.js')
    const user = UserModel.default

    const DeviceModel = await import('../app/models/device.js')
    const device = DeviceModel.default

    const TwitchStreamerModel = await import('../app/models/twitch_stream.js')
    const twitchStream = TwitchStreamerModel.default

    // Clear admin user if it exists
    const isAdminAlreadyExist = await user.query().where('role', UserRole.Admin).first()

    if (isAdminAlreadyExist) {
      await isAdminAlreadyExist.delete()
    }

    // Delete all users created in previous run
    await user.query().delete()
    // Delete all devices created in previous run
    await device.query().delete()
    // Delete all twitch streams created in previous run
    await twitchStream.query().delete()
  }

  async createAdminUser() {
    const usersFactory = await this.getUserFactory()
    const userId = randomUUID()

    const adminUser = await usersFactory
      .merge({
        id: userId,
        email: `admin@lousa.com`,
        role: UserRole.Admin,
      })
      .create()

    const deviceFactory = await this.getDeviceFactory()
    const accessToken = generateToken(userId)
    const refreshToken = generateToken(userId)

    deviceFactory
      .merge({
        accessToken: accessToken,
        refreshToken: refreshToken,
        userId: userId,
        locale: 'fr-FR',
        language: 'fr',
        timezone: 'Europe/Paris',
        model: 'browser',
        os: 'mac',
        osVersion:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        appVersion: '1.0.0',
        lastIp: '127.0.0.1',
        lastConnectionAt: DateTime.fromJSDate(new Date()),
      })
      .create()

    return adminUser
  }

  async createStreamersList() {
    // use a array of data here
    for (const streamer of streamersList) {
      const twitchStreamsFactory = await this.getTwitchStreamsFactory()

      twitchStreamsFactory
        .merge({
          twitchId: streamer.twitchId,
          userLogin: streamer.userLogin,
          userName: streamer.userName,
          thumbnailUrl: streamer.thumbnailUrl,
        })
        .create()
    }
  }

  async createUsers() {
    const usersFactory = await this.getUserFactory()
    const deviceFactory = await this.getDeviceFactory()

    let totalUsers = Number.parseInt(this.numberViewer!) + Number.parseInt(this.numberStreamer!)
    let streamerCount = 0
    let UsersArray: User[] = []

    for (let i = 1; i <= totalUsers; i++) {
      const userId = randomUUID()
      let email: string = `viewer-${i}@lousa.com`

      if (streamerCount < Number.parseInt(this.numberStreamer!)) {
        email = `streamer-${i}@lousa.com`
        streamerCount++
      }

      const user = await usersFactory
        .merge({
          id: userId,
          email: email,
          role: UserRole.User,
        })
        .create()

      UsersArray.push(user)

      const accessToken = generateToken(userId)
      const refreshToken = generateToken(userId)

      deviceFactory
        .merge({
          accessToken: accessToken,
          refreshToken: refreshToken,
          userId: userId,
          locale: 'fr-FR',
          language: 'fr',
          timezone: 'Europe/Paris',
          model: 'browser',
          os: 'mac',
          osVersion:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          appVersion: '1.0.0',
          lastIp: '127.0.0.1',
          lastConnectionAt: DateTime.fromJSDate(new Date()),
        })
        .create()
    }

    return UsersArray
  }

  async setUsersStreamerProfile() {
    const twitchUsersFactory = await this.getTwitchUsersFactory()

    const randomStreamers = await TwitchStream.query()
      .orderByRaw('RANDOM()')
      .limit(Number.parseInt(this.numberStreamer!))

    const userStreamers: User[] = await User.query().where('email', 'ILIKE', '%streamer%')

    for (const [index, streamer] of randomStreamers.entries()) {
      const user = userStreamers[index]

      streamer.dateActivation = DateTime.fromJSDate(new Date())
      streamer.userId = user.id
      streamer.save()

      twitchUsersFactory
        .merge({
          userId: user.id,
          twitchId: streamer.twitchId,
          displayName: streamer.userLogin,
          emailTwitch: user.email,
          avatarUrl: streamer.thumbnailUrl,
          viewCount: 0,
          status: ModelStatus.Enabled,
          isStreamer: true,
        })
        .create()
    }
  }
}
