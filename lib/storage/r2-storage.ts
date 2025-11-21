import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type {
  StorageProvider,
  PackageRecord,
  PackageInput,
  StorageOptions,
} from "./types";

interface R2Metadata {
  id: string;
  type: "h5p" | "scorm"; // cspell:disable-line
  filename: string;
  mimeType: string;
  size: number;
  checksum?: string;
  metadata: Record<string, unknown> | undefined;
  uploadedAt: string;
  expiresAt: number | undefined;
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

export class R2Storage implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix = "packages";

  constructor(private readonly options: StorageOptions = {}) {
    this.client = getR2Client();
    this.bucket = process.env["R2_BUCKET_NAME"] ?? "h5p-and-scorm";
  }

  private metaKey(id: string): string {
    return `${this.prefix}/${id}/meta.json`;
  }

  private fileKey(id: string): string {
    return `${this.prefix}/${id}/file.bin`;
  }

  async store(payload: PackageInput): Promise<PackageRecord> {
    const uploadedAt = payload.uploadedAt ?? new Date();
    const expiresAt =
      this.options.ttlMs !== undefined
        ? uploadedAt.getTime() + this.options.ttlMs
        : undefined;

    const meta: R2Metadata = {
      id: payload.id,
      type: payload.type,
      filename: payload.file.filename,
      mimeType: payload.file.mimeType,
      size: payload.file.size,
      metadata: payload.metadata,
      uploadedAt: uploadedAt.toISOString(),
      expiresAt,
    };
    if (payload.file.checksum) {
      meta.checksum = payload.file.checksum;
    }

    await Promise.all([
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.fileKey(payload.id),
          Body: payload.file.buffer,
          ContentType: payload.file.mimeType,
        })
      ),
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.metaKey(payload.id),
          Body: JSON.stringify(meta),
          ContentType: "application/json",
        })
      ),
    ]);

    return {
      ...payload,
      metadata: payload.metadata ?? undefined,
      uploadedAt,
      expiresAt,
    };
  }

  async get(id: string): Promise<PackageRecord | undefined> {
    try {
      const [metaResponse, fileResponse] = await Promise.all([
        this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: this.metaKey(id),
          })
        ),
        this.client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: this.fileKey(id),
          })
        ),
      ]);

      const metaBody = await metaResponse.Body?.transformToString();
      if (!metaBody) return undefined;

      const meta: R2Metadata = JSON.parse(metaBody);

      if (meta.expiresAt && meta.expiresAt <= Date.now()) {
        await this.delete(id);
        return undefined;
      }

      const fileBytes = await fileResponse.Body?.transformToByteArray();
      if (!fileBytes) return undefined;

      const buffer = Buffer.from(fileBytes);

      const file: PackageRecord["file"] = {
        filename: meta.filename,
        mimeType: meta.mimeType,
        size: meta.size,
        buffer,
      };
      if (meta.checksum) {
        file.checksum = meta.checksum;
      }

      return {
        id: meta.id,
        type: meta.type,
        file,
        metadata: meta.metadata,
        uploadedAt: new Date(meta.uploadedAt),
        expiresAt: meta.expiresAt,
      };
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Promise.all([
        this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: this.metaKey(id),
          })
        ),
        this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: this.fileKey(id),
          })
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.metaKey(id),
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<PackageRecord[]> {
    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${this.prefix}/`,
        })
      );

      const metaKeys =
        response.Contents?.filter((obj) => obj.Key?.endsWith("/meta.json")) ?? [];

      const records: PackageRecord[] = [];

      for (const obj of metaKeys) {
        const pathParts = obj.Key?.split("/") ?? [];
        const id = pathParts[1];
        if (id) {
          const record = await this.get(id);
          if (record) records.push(record);
        }
      }

      return records;
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${this.prefix}/`,
        })
      );

      const keys = response.Contents?.map((obj) => obj.Key).filter(Boolean) ?? [];

      await Promise.all(
        keys.map((key) =>
          this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: key,
            })
          )
        )
      );
    } catch {
      // Ignore errors during clear
    }
  }
}
