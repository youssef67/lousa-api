import { defineConfig } from '@adonisjs/transmit'

export default defineConfig({
  pingInterval: false,
  transport: null,
  driver: 'redis',
  redisConnection: 'local',
})
