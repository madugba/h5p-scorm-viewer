/**
 * Volatile storage layer for uploaded packages.
 *
 * This Map-backed cache keeps bytes inside the same Node worker so previews
 * feel instant during development, QA demos, or short-lived review sessions.
 * Nothing persists beyond the lifetime of the process, and no external
 * infrastructure is required for basic testing.
 *
 * Trade-offs:
 *  - Data disappears whenever the process restarts or redeploys.
 *  - Requests routed to a different worker/serverless instance will not find
 *    the uploaded package, leading to 404 responses for existing links.
 *  - Storing many large archives in memory increases RSS and can trip platform
 *    memory limits.
 *  - No replication, access control, or audit log is provided.
 *
 * Production deployments should replace this module with a durable store such
 * as S3, Vercel Blob, or a database capable of storing binary assets plus
 * metadata. Keeping the same class interface makes the swap transparent to
 * the rest of the application.
 */
export type PackageType = "h5p" | "scorm";

export interface StoredFile {
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  checksum?: string;
}

export interface PackageRecord {
  id: string;
  type: PackageType;
  file: StoredFile;
  metadata: Record<string, unknown> | undefined;
  uploadedAt: Date;
  expiresAt: number | undefined;
}

export interface StorageOptions {
  ttlMs?: number;
}

interface PackageInput extends Omit<PackageRecord, "uploadedAt" | "expiresAt"> {
  uploadedAt?: Date;
}


export class InMemoryStorage {
  private readonly records = new Map<string, PackageRecord>();

  constructor(private readonly options: StorageOptions = {}) {}

  store(payload: PackageInput): PackageRecord {
    const uploadedAt = payload.uploadedAt ?? new Date();
    const expiresAt =
      this.options.ttlMs !== undefined
        ? uploadedAt.getTime() + this.options.ttlMs
        : undefined;

    const record: PackageRecord = {
      ...payload,
      metadata: payload.metadata ?? undefined,
      uploadedAt,
      expiresAt
    };

    this.records.set(record.id, record);
    return record;
  }

  get(id: string): PackageRecord | undefined {
    const record = this.records.get(id);
    if (!record) {
      return undefined;
    }

    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.records.delete(id);
      return undefined;
    }

    return record;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  exists(id: string): boolean {
    return this.get(id) !== undefined;
  }

  list(): PackageRecord[] {
    this.purgeExpired();
    return [...this.records.values()];
  }

  clear(): void {
    this.records.clear();
  }

  purgeExpired(): void {
    const now = Date.now();
    for (const [id, record] of this.records) {
      if (record.expiresAt && record.expiresAt <= now) {
        this.records.delete(id);
      }
    }
  }
  
}

/**
 * Global singleton instance shared across hot-reload workers.
 *
 * Turbopack and Next.js dev servers can spawn multiple Node workers. Attaching
 * the storage object to `globalThis` ensures each worker reuses the same
 * Map-backed cache instead of starting empty, so preview links continue to
 * resolve after code reloads. Production builds still create an isolated
 * instance per process.
 */
declare global {
  // eslint-disable-next-line no-var
  var __H5P_SCORM_IN_MEMORY_STORAGE__:
    | InMemoryStorage
    | undefined;
}

const storageInstance =
  globalThis.__H5P_SCORM_IN_MEMORY_STORAGE__ ??
  (globalThis.__H5P_SCORM_IN_MEMORY_STORAGE__ =
    new InMemoryStorage());

export const inMemoryStorage = storageInstance;


