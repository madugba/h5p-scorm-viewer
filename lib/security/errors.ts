export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SIZE_EXCEEDED"
      | "INVALID_MIME"
      | "INVALID_EXTENSION"
      | "MISSING_FILE"
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ZipExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_ZIP"
      | "ZIP_SLIP_DETECTED"
      | "TOO_MANY_ENTRIES"
      | "SIZE_EXCEEDED"
      | "EXTRACTION_FAILED"
  ) {
    super(message);
    this.name = "ZipExtractionError";
    Object.setPrototypeOf(this, ZipExtractionError.prototype);
  }
}


