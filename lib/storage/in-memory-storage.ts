export type PackageType = "h5p" | "scorm";



// declare type interface

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

export const inMemoryStorage = new InMemoryStorage();


