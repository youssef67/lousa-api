import crypto from 'node:crypto'
import shortUUID from 'short-uuid'

const POOL_SIZE_MULTIPLIER = 128
let pool: Buffer
let poolOffset: number

export const randomShortUuid = (): string => {
  const translator = shortUUID()
  return translator.new()
}

// Fill pool with random data
const fillPool = (bytes: number): void => {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER)
    crypto.randomFillSync(pool)
    poolOffset = 0
  } else if (poolOffset + bytes > pool.length) {
    crypto.randomFillSync(pool)
    poolOffset = 0
  }
  poolOffset += bytes
}

// Generate random bytes
const random = (bytes: number): Buffer => {
  fillPool((bytes -= 0)) // convert `bytes` to number to prevent `valueOf` abusing
  return pool.subarray(poolOffset - bytes, poolOffset)
}

// Generate a custom random string
const customRandom = (
  alphabet: string,
  defaultSize: number,
  getRandom: (size: number) => Buffer
) => {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1
  const step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length)

  return (size = defaultSize): string => {
    let id = ''
    while (true) {
      const bytes = getRandom(step)
      let i = step
      while (i--) {
        id += alphabet[bytes[i] & mask] || ''
        if (id.length === size) return id
      }
    }
  }
}

// Generate a random string from a custom alphabet
const customAlphabet = (alphabet: string, size = 21): string =>
  customRandom(alphabet, size, random)()

export const randomOrderIdentifier = (letterLength: number): string =>
  customAlphabet('1234567890', 10) + customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', letterLength)

// Helper characters for different types of strings
const urlSafeCharacters = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~']
const numericCharacters = [...'0123456789']
const distinguishableCharacters = [...'CDEHKMPRTUWXY012458']
const asciiPrintableCharacters = [
  ...'!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
]
const alphanumericCharacters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789']

// Read UInt16LE from Uint8Array
const readUInt16LE = (uInt8Array: Uint8Array, offset: number): number =>
  uInt8Array[offset] + (uInt8Array[offset + 1] << 8)

// Generate a random string for custom characters
const generateForCustomCharacters = (
  length: number,
  characters: string[],
  randomBytes: (size: number) => Uint8Array
): string => {
  const characterCount = characters.length
  const maxValidSelector = Math.floor(0x1_00_00 / characterCount) * characterCount - 1
  const entropyLength = 2 * Math.ceil(1.1 * length)
  let string = ''
  let stringLength = 0

  while (stringLength < length) {
    const entropy = randomBytes(entropyLength)
    let entropyPosition = 0

    while (entropyPosition < entropyLength && stringLength < length) {
      const entropyValue = readUInt16LE(entropy, entropyPosition)
      entropyPosition += 2
      if (entropyValue > maxValidSelector) {
        continue
      }

      string += characters[entropyValue % characterCount]
      stringLength++
    }
  }

  return string
}

// Allowed types of strings
const allowedTypes = new Set<string | undefined>([
  undefined,
  'hex',
  'base64',
  'url-safe',
  'numeric',
  'distinguishable',
  'ascii-printable',
  'alphanumeric',
])

// Create a generator for random strings
const createGenerator =
  (
    // eslint-disable-next-line @typescript-eslint/no-shadow
    generateForCustomCharacters: (
      length: number,
      characters: string[],
      randomBytes: (size: number) => Uint8Array
    ) => string,
    specialRandomBytes: (
      byteLength: number,
      type: crypto.BinaryToTextEncoding,
      length: number
    ) => string,
    randomBytes: (size: number) => Uint8Array
  ) =>
  ({
    length,
    type,
    characters,
  }: {
    length: number
    type?: string
    characters?: string
  }): string => {
    if (!(length >= 0 && Number.isFinite(length))) {
      throw new TypeError('Expected a `length` to be a non-negative finite number')
    }

    if (type !== undefined && characters !== undefined) {
      throw new TypeError('Expected either `type` or `characters`')
    }

    if (characters !== undefined && typeof characters !== 'string') {
      throw new TypeError('Expected `characters` to be string')
    }

    if (!allowedTypes.has(type)) {
      throw new TypeError(`Unknown type: ${type}`)
    }

    if (type === undefined && characters === undefined) {
      type = 'hex'
    }

    if (type === 'hex' || (type === undefined && characters === undefined)) {
      return specialRandomBytes(Math.ceil(length * 0.5), 'hex', length)
    }

    if (type === 'base64') {
      return specialRandomBytes(Math.ceil(length * 0.75), 'base64', length)
    }

    if (type === 'url-safe') {
      return generateForCustomCharacters(length, urlSafeCharacters, randomBytes)
    }

    if (type === 'numeric') {
      return generateForCustomCharacters(length, numericCharacters, randomBytes)
    }

    if (type === 'distinguishable') {
      return generateForCustomCharacters(length, distinguishableCharacters, randomBytes)
    }

    if (type === 'ascii-printable') {
      return generateForCustomCharacters(length, asciiPrintableCharacters, randomBytes)
    }

    if (type === 'alphanumeric') {
      return generateForCustomCharacters(length, alphanumericCharacters, randomBytes)
    }

    if (characters!.length === 0) {
      throw new TypeError('Expected `characters` string length to be greater than or equal to 1')
    }

    if (characters!.length > 0x1_00_00) {
      throw new TypeError('Expected `characters` string length to be less or equal to 65536')
    }

    return generateForCustomCharacters(length, characters!.split(''), randomBytes)
  }

// Create a string generator
const createStringGenerator = (
  specialRandomBytes: (
    byteLength: number,
    type: crypto.BinaryToTextEncoding,
    length: number
  ) => string,
  randomBytes: (size: number) => Uint8Array
) => {
  return createGenerator(generateForCustomCharacters, specialRandomBytes, randomBytes)
}

export const cryptoRandomString = createStringGenerator(
  (byteLength, type, length) => crypto.randomBytes(byteLength).toString(type).slice(0, length),
  (size) => new Uint8Array(crypto.randomBytes(size))
)
