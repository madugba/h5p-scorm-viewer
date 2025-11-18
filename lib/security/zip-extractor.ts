import { resolve, normalize, join } from "path";
import AdmZip from "adm-zip";
import { ZipExtractionError } from "./errors";

export interface ExtractedFile {
  path: string;
  content: Buffer;
  size: number;
}

export interface ExtractionOptions {
  maxEntries?: number;
  maxTotalSize?: number;
}

const DEFAULT_MAX_ENTRIES = 10000;
const DEFAULT_MAX_TOTAL_SIZE = 500 * 1024 * 1024;

/**
 * Checks if a given entry path is safe to extract to a target directory.
 * This function checks for potential zip-slip attacks by ensuring that the entry path is not outside the target directory.
 * It also normalizes the path to ensure that it is safe to extract.
 * @param entryPath - The path of the entry to check.
 * @param targetDir - The target directory to extract the entry to.
 * @returns An object containing a boolean indicating if the path is safe and the resolved path.
 */
function isPathSafe(
  entryPath: string,
  targetDir: string
): { safe: boolean; resolvedPath: string } {
  if (entryPath.includes("..")) {
    return { safe: false, resolvedPath: "" };
  }

  if (entryPath.startsWith("/") || /^[A-Za-z]:/.test(entryPath)) {
    return { safe: false, resolvedPath: "" };
  }

  const normalizedEntry = normalize(entryPath).replace(/\\/g, "/");
  const resolvedTarget = resolve(targetDir);
  const resolvedEntry = resolve(targetDir, normalizedEntry);

  const isSafe =
    resolvedEntry.startsWith(resolvedTarget + "/") ||
    resolvedEntry === resolvedTarget;

  return { safe: isSafe, resolvedPath: resolvedEntry };
}

export async function extractZip(
  buffer: Buffer,
  targetDir: string,
  options: ExtractionOptions = {}
): Promise<ExtractedFile[]> {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxTotalSize = options.maxTotalSize ?? DEFAULT_MAX_TOTAL_SIZE;

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch (error) {
    throw new ZipExtractionError(
      `Invalid ZIP file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INVALID_ZIP"
    );
  }

  const entries = zip.getEntries();
  if (entries.length > maxEntries) {
    throw new ZipExtractionError(
      `ZIP contains too many entries (${entries.length}). Maximum allowed: ${maxEntries}`,
      "TOO_MANY_ENTRIES"
    );
  }

  const extractedFiles: ExtractedFile[] = [];
  let totalSize = 0;

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const entryPath = entry.entryName;
    const { safe, resolvedPath } = isPathSafe(entryPath, targetDir);

    if (!safe) {
      throw new ZipExtractionError(
        `Zip-slip attack detected: entry path "${entryPath}" resolves outside target directory`,
        "ZIP_SLIP_DETECTED"
      );
    }

    let content: Buffer;
    try {
      content = entry.getData();
    } catch (error) {
      throw new ZipExtractionError(
        `Failed to extract entry "${entryPath}": ${error instanceof Error ? error.message : "Unknown error"}`,
        "EXTRACTION_FAILED"
      );
    }

    const entrySize = content.length;
    totalSize += entrySize;

    if (totalSize > maxTotalSize) {
      throw new ZipExtractionError(
        `Total extracted size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxTotalSize / 1024 / 1024).toFixed(0)}MB)`,
        "SIZE_EXCEEDED"
      );
    }

    const relativePath = entryPath.replace(/\\/g, "/");
    extractedFiles.push({
      path: relativePath,
      content,
      size: entrySize
    });
  }

  return extractedFiles;
}

