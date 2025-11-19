"use server";

import { nanoid } from "nanoid";
import {
  getDefaultValidationConfig,
  getH5PValidationConfig,
  getSCORMValidationConfig,
  type ValidationConfig,
  validateFile
} from "@/lib/security/file-validator";
import {
  inMemoryStorage,
  type PackageType
} from "@/lib/storage/in-memory-storage";
import { ValidationError } from "@/lib/security/errors";

type UploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; packageId: string; packageType: PackageType };

export const initialUploadState: UploadState = { status: "idle" };

const EXTENSION_TO_TYPE: Record<string, PackageType> = {
  ".h5p": "h5p",
  ".zip": "scorm"
};

const PACKAGE_TYPE_FIELD = "packageType";
const FILE_FIELD = "package";

export function inferPackageType(
  filename: string,
  override: string | null
): PackageType | null {
  if (override === "h5p" || override === "scorm") {
    return override;
  }
  const extension = getFileExtension(filename);
  return EXTENSION_TO_TYPE[extension] ?? null;
}

function getFileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function resolveValidationConfig(type: PackageType): ValidationConfig {
  if (type === "h5p") {
    return getH5PValidationConfig();
  }
  if (type === "scorm") {
    return getSCORMValidationConfig();
  }
  return getDefaultValidationConfig();
}

export async function uploadPackageAction(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  try {
    const fileEntry = formData.get(FILE_FIELD);
    if (!(fileEntry instanceof File)) {
      throw new ValidationError("Upload a .h5p or .zip package.", "MISSING_FILE");
    }

    const packageTypeInput = formData.get(PACKAGE_TYPE_FIELD);
    const packageType = inferPackageType(
      fileEntry.name,
      typeof packageTypeInput === "string" ? packageTypeInput : null
    );

    if (!packageType) {
      throw new ValidationError(
        "Unsupported file extension. Upload .h5p or .zip archives.",
        "INVALID_EXTENSION"
      );
    }

    const validationConfig = resolveValidationConfig(packageType);
    validateFile(
      {
        size: fileEntry.size,
        name: fileEntry.name,
        type: fileEntry.type
      },
      validationConfig
    );

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const id = nanoid(10);

    inMemoryStorage.store({
      id,
      type: packageType,
      file: {
        filename: fileEntry.name,
        mimeType: fileEntry.type,
        size: fileEntry.size,
        buffer
      },
      metadata: undefined,
      uploadedAt: new Date()
    });

    return {
      status: "success",
      packageId: id,
      packageType
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: "error", message: error.message };
    }
    console.error("[uploadPackageAction]", error);
    return {
      status: "error",
      message: "Upload failed. Please try again."
    };
  }
}

export type { UploadState };

