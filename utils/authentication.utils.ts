import crypto from 'node:crypto'

export const generateToken = (additionalData: string): string => {
  const currentDate = new Date().getTime()
  const randomHex = crypto.randomBytes(64).toString('hex')

  const token = Buffer.from(
    crypto
      .createHash('sha256')
      .update(currentDate + randomHex + (additionalData || ''))
      .digest('hex'),
    'hex'
  ).toString('base64')

  return token
}
