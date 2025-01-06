export class ApiError {
  message: string
  key: string
  code: string
  validationErrors: Object[]
  constructor(message: string, key: string, code: string, validationErrors: Object[] = []) {
    this.message = message
    this.key = key
    this.code = code
    this.validationErrors = validationErrors
  }

  toJson() {
    return {
      message: this.message,
      key: this.key,
      code: this.code,
      validationErrors: this.validationErrors,
    }
  }

  static newError(
    key: string,
    code: string,
    validationErrors?: Object[],
    message?: string
  ): ApiError {
    const finalMessage = message ?? 'An error occurred'
    const newError = new ApiError(finalMessage, key, code, validationErrors)
    return newError
  }
}

export default ApiError
