export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export const validationError = (message: string, details: Record<string, unknown> = {}) =>
  new ApiError(400, 'VALIDATION_ERROR', message, details)

export const notFound = (what = '대상') => new ApiError(404, 'NOT_FOUND', `${what}을(를) 찾을 수 없습니다.`)
