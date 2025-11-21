import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import {
  validateFile,
  getH5PValidationConfig,
  getSCORMValidationConfig,
  getDefaultValidationConfig,
} from "@/lib/security/file-validator";
import { ValidationError } from "@/lib/security/errors";
import { inferPackageType } from "@/lib/upload/infer-package-type";
import { generateId } from "@/lib/utils/id-generator";
import { ApiError } from "@/lib/errors/api-error";
import type { PackageType } from "@/lib/storage";

const PresignRequestSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  size: z.number().positive("File size must be positive"),
  mimeType: z.string().optional(),
  packageType: z.enum(["auto", "h5p", "scorm"]).default("auto"),
});

function getR2Client(): S3Client {
  const endpoint = process.env["R2_ENDPOINT"];
  if (!endpoint) {
    throw new Error("R2_ENDPOINT environment variable is required");
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env["R2_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"] ?? "",
    },
  });
}

function resolveValidationConfig(type: PackageType) {
  if (type === "h5p") return getH5PValidationConfig();
  if (type === "scorm") return getSCORMValidationConfig();
  return getDefaultValidationConfig();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PresignRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.issues[0]?.message ?? "Invalid request",
        { issues: parsed.error.issues }
      );
    }

    const { filename, size, mimeType, packageType: packageTypeOverride } = parsed.data;

    const packageType = inferPackageType(
      filename,
      packageTypeOverride === "auto" ? null : packageTypeOverride
    );

    if (!packageType) {
      throw ApiError.validation(
        "Unsupported file extension. Upload .h5p or .zip archives."
      );
    }

    try {
      const validationConfig = resolveValidationConfig(packageType);
      validateFile({ size, name: filename, type: mimeType }, validationConfig);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw ApiError.validation(error.message);
      }
      throw error;
    }

    const id = generateId();
    const bucket = process.env["R2_BUCKET_NAME"] ?? "h5p-and-scorm";
    const fileKey = `packages/${id}/file.bin`;

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: mimeType ?? "application/octet-stream",
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({
      uploadUrl,
      packageId: id,
      packageType,
      fileKey,
    });
  } catch (error) {
    const apiError = ApiError.fromUnknown(error);
    console.error("[presign]", apiError.message);
    return NextResponse.json(apiError.toResponse(), { status: apiError.statusCode });
  }
}
