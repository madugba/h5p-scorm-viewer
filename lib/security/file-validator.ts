import { z } from "zod";
import { ValidationError } from "./errors";

const ValidationConfigSchema = z.object({
  maxSizeBytes: z.number().positive(),
  allowedMimeTypes: z.array(z.string()).min(1),
  allowedExtensions: z.array(z.string()).min(1)
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

export interface FileInput {
  size: number;
  name: string;
  type?: string;
}

export const DEFAULT_MAX_SIZE_MB = 100;
const MAX_SIZE_MB =
  typeof process !== "undefined" && process.env.MAX_FILE_SIZE_MB
    ? Number.parseInt(process.env.MAX_FILE_SIZE_MB, 10)
    : DEFAULT_MAX_SIZE_MB;

export const BYTES_PER_MB = 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = MAX_SIZE_MB * BYTES_PER_MB;

export function getDefaultValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    allowedExtensions: [".h5p", ".zip"]
  };
}

export function getH5PValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    allowedExtensions: [".h5p"]
  };
}

export function getSCORMValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    allowedExtensions: [".zip"]
  };
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
}

function validateSize(size: number, maxSizeBytes: number): void {
  if (size > maxSizeBytes) {
    const sizeMB = (size / BYTES_PER_MB).toFixed(2);
    const maxMB = (maxSizeBytes / BYTES_PER_MB).toFixed(0);
    throw new ValidationError(
      `File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`,
      "SIZE_EXCEEDED"
    );
  }
}

function validateExtension(
  filename: string,
  allowedExtensions: readonly string[]
): void {
  const ext = getFileExtension(filename);
  if (!allowedExtensions.includes(ext)) {
    throw new ValidationError(
      `File extension "${ext}" is not allowed. Allowed extensions: ${allowedExtensions.join(", ")}`,
      "INVALID_EXTENSION"
    );
  }
}

function validateMimeType(
  mimeType: string | undefined,
  allowedMimeTypes: readonly string[]
): void {
  if (!mimeType) {
    return;
  }

  if (!allowedMimeTypes.includes(mimeType)) {
    throw new ValidationError(
      `MIME type "${mimeType}" is not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`,
      "INVALID_MIME"
    );
  }
}

export function validateFile(
  file: FileInput,
  config?: Partial<ValidationConfig>
): void {
  const fullConfig = { ...getDefaultValidationConfig(), ...config };
  const validatedConfig = ValidationConfigSchema.parse(fullConfig);

  if (!file || file.size === undefined) {
    throw new ValidationError("File is missing or invalid", "MISSING_FILE");
  }

  validateSize(file.size, validatedConfig.maxSizeBytes);
  validateExtension(file.name, validatedConfig.allowedExtensions);
  validateMimeType(file.type, validatedConfig.allowedMimeTypes);
}


