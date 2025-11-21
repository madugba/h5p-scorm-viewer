import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { ApiError } from "@/lib/errors/api-error";
import type { PackageType } from "@/lib/storage";

const CompleteRequestSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  packageType: z.enum(["h5p", "scorm"]),
  filename: z.string().min(1, "Filename is required"),
  size: z.number().positive(),
  mimeType: z.string().optional(),
});

interface R2Metadata {
  id: string;
  type: PackageType;
  filename: string;
  mimeType: string;
  size: number;
  metadata: undefined;
  uploadedAt: string;
  expiresAt: undefined;
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CompleteRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.validation(
        parsed.error.issues[0]?.message ?? "Invalid request",
        { issues: parsed.error.issues }
      );
    }

    const { packageId, packageType, filename, size, mimeType } = parsed.data;

    const client = getR2Client();
    const bucket = process.env["R2_BUCKET_NAME"] ?? "h5p-and-scorm";
    const fileKey = `packages/${packageId}/file.bin`;
    const metaKey = `packages/${packageId}/meta.json`;

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        })
      );
    } catch {
      throw ApiError.uploadFailed(
        "File upload not found. The upload may have failed or expired."
      );
    }

    const meta: R2Metadata = {
      id: packageId,
      type: packageType,
      filename,
      mimeType: mimeType ?? "application/octet-stream",
      size,
      metadata: undefined,
      uploadedAt: new Date().toISOString(),
      expiresAt: undefined,
    };

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: metaKey,
        Body: JSON.stringify(meta),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({
      success: true,
      packageId,
      packageType,
      viewerUrl: `/${packageType}/${packageId}`,
    });
  } catch (error) {
    const apiError = ApiError.fromUnknown(error);
    console.error("[complete]", apiError.message);
    return NextResponse.json(apiError.toResponse(), { status: apiError.statusCode });
  }
}
