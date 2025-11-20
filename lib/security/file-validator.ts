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
  type?: string | undefined;
}

export const DEFAULT_MAX_SIZE_MB = 100;

/**
 * Determine the configured max size (in MB) by inspecting env overrides.
 * Falls back to {@link DEFAULT_MAX_SIZE_MB} when the env var is missing/invalid.
 */
const MAX_SIZE_MB =
  typeof process !== "undefined" && process.env["MAX_FILE_SIZE_MB"]
    ? Number.parseInt(process.env["MAX_FILE_SIZE_MB"], 10)
    : DEFAULT_MAX_SIZE_MB;

export const BYTES_PER_MB = 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = MAX_SIZE_MB * BYTES_PER_MB;

/**
 * Baseline validation config that accepts both H5P and SCORM file types.
 */
export function getDefaultValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    allowedExtensions: [".h5p", ".zip"]
  };
}

/**
 * Validation config with H5P-specific extension constraints.
 */
export function getH5PValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    allowedExtensions: [".h5p"]
  };
}

/**
 * Validation config with SCORM-specific extension constraints.
 */
export function getSCORMValidationConfig(): ValidationConfig {
  return {
    maxSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    allowedExtensions: [".zip"]
  };
}


/**
 * Get the file extension from a filename.
 * @param filename - The filename to get the extension from.
 * @returns The file extension.
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
}

/**
 * Validate the size of a file.
 * @param size - The size of the file in bytes.
 * @param maxSizeBytes - The maximum allowed size of the file in bytes.
 * @throws {ValidationError} If the file size exceeds the maximum allowed size.
 */
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

/**
 * Ensure the filename uses an allowed extension.
 * @param filename - Name provided by the file input.
 * @param allowedExtensions - List of whitelisted extensions.
 */
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

/**
 * Ensure the MIME type is explicitly allowed by the config.
 * Empty strings are tolerated, since browsers sometimes omit this metadata.
 */
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

/**
 * Validate a file descriptor against the provided configuration.
 * @throws {ValidationError} when any constraint fails (size, extension, mime).
 */
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


