import { NextResponse } from "next/server";
import {
  validateFile,
  getH5PValidationConfig,
  getSCORMValidationConfig,
  getDefaultValidationConfig,
} from "@/lib/security/file-validator";
import { ValidationError } from "@/lib/security/errors";
import { inferPackageType } from "@/lib/upload/infer-package-type";
import { validatePackageContents } from "@/lib/upload/validate-package";
import { ApiError } from "@/lib/errors/api-error";
import type { PackageType } from "@/lib/storage";

function resolveValidationConfig(type: PackageType) {
  if (type === "h5p") return getH5PValidationConfig();
  if (type === "scorm") return getSCORMValidationConfig();
  return getDefaultValidationConfig();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const packageTypeOverride = (formData.get("packageType") as string) ?? "auto";

    if (!file) {
      throw ApiError.validation("No file provided");
    }

    const packageType = inferPackageType(
      file.name,
      packageTypeOverride === "auto" ? null : (packageTypeOverride as PackageType)
    );

    if (!packageType) {
      throw ApiError.validation(
        "Unsupported file extension. Upload .h5p or .zip archives."
      );
    }

    try {
      const validationConfig = resolveValidationConfig(packageType);
      validateFile(
        { size: file.size, name: file.name, type: file.type },
        validationConfig
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw ApiError.validation(error.message);
      }
      throw error;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentValidation = validatePackageContents(buffer, packageType);

    if (!contentValidation.valid) {
      throw ApiError.validation(
        contentValidation.error ?? "Invalid package contents"
      );
    }

    return NextResponse.json({
      valid: true,
      packageType: contentValidation.packageType,
    });
  } catch (error) {
    const apiError = ApiError.fromUnknown(error);
    console.error("[validate]", apiError.message);
    return NextResponse.json(apiError.toResponse(), { status: apiError.statusCode });
  }
}
