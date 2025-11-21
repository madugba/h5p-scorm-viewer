export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UPLOAD_FAILED"
  | "STORAGE_ERROR"
  | "PARSE_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  toResponse(): ApiErrorResponse {
    const response: ApiErrorResponse = {
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details) {
      response.error.details = this.details;
    }
    return response;
  }

  static validation(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError("VALIDATION_ERROR", message, 400, details);
  }

  static notFound(message: string = "Resource not found"): ApiError {
    return new ApiError("NOT_FOUND", message, 404);
  }

  static uploadFailed(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError("UPLOAD_FAILED", message, 500, details);
  }

  static storageError(message: string): ApiError {
    return new ApiError("STORAGE_ERROR", message, 500);
  }

  static parseError(message: string): ApiError {
    return new ApiError("PARSE_ERROR", message, 422);
  }

  static internal(message: string = "An unexpected error occurred"): ApiError {
    return new ApiError("INTERNAL_ERROR", message, 500);
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof Error) {
      return new ApiError("INTERNAL_ERROR", error.message, 500);
    }
    return ApiError.internal();
  }
}
