import { createLogger, format, Logger, transports } from 'winston'
import 'winston-daily-rotate-file'
import env from '#start/env'
const logFile = env.get('API_LOG_FILE')
import fs from 'node:fs'
import path from 'node:path'
import * as Transport from 'winston-transport'

const computeTransports = () => {
  const transportArray: Transport[] = [new transports.Console()]

  if (logFile) {
    const logDir = path.dirname(logFile)

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    // Check if the file exists, if not, create it
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '')
    }
    transportArray.push(new transports.File({ filename: logFile }))
    // Add the daily rotate file transport
    transportArray.push(
      new transports.DailyRotateFile({
        filename: path.join(logDir, 'api.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100k',
        maxFiles: '8d',
      })
    )
  }
  return transportArray
}

const loggerWinston = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message}`
    })
  ),
  transports: computeTransports(),
})

export interface LoggerW {
  logger: Logger
  debug: (message: string, data?: any) => void
  info: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
  reportIllegalState: (message: string, data?: any) => void
}

const prettyMessageWithData = (message: string, data?: any): string => {
  if (typeof data === 'string') {
    return `${message}\n${data}`
  } else if (data) {
    const dataJsonStr = JSON.stringify(data, null, 2)
    return `${message}\n${dataJsonStr}`
  } else {
    return message
  }
}

const loggerW: LoggerW = {
  logger: loggerWinston,
  debug: (message, data) => {
    loggerWinston.debug(prettyMessageWithData(message, data))
  },
  info: (message, data) => {
    loggerWinston.info(prettyMessageWithData(message, data))
  },
  error: (message, data) => {
    loggerWinston.error(prettyMessageWithData(message, data))
  },
  reportIllegalState: (message, data) => {
    // TODO
    loggerWinston.error(prettyMessageWithData(message, data))
  },
}

export default loggerW
