"use server";

import { nanoid } from "nanoid";
import { ZodError } from "zod";
import {
  getDefaultValidationConfig,
  getH5PValidationConfig,
  getSCORMValidationConfig,
  type ValidationConfig,
  validateFile
} from "@/lib/security/file-validator";
import { inMemoryStorage, type PackageType } from "@/lib/storage/in-memory-storage";
import { ValidationError } from "@/lib/security/errors";
import { inferPackageType } from "@/lib/upload/infer-package-type";
import { parseUploadFormData } from "@/lib/upload/upload-form-schema";
import type { UploadState } from "./state";

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
    const parsedForm = parseUploadFormData(formData);
    const fileEntry = parsedForm.package;
    const packageTypeOverride = parsedForm.packageType === "auto" ? null : parsedForm.packageType;

    const packageType = inferPackageType(
      fileEntry.name,
      packageTypeOverride
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
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return {
        status: "error",
        message: issue?.message ?? "Invalid upload submission."
      };
    }
    console.error("[uploadPackageAction]", error);
    return {
      status: "error",
      message: "Upload failed. Please try again."
    };
  }
}

