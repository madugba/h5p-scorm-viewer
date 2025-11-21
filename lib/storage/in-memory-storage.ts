import type {
  StorageProvider,
  PackageRecord,
  PackageInput,
  StorageOptions,
} from "./types";

export type { PackageType, StoredFile, PackageRecord, StorageOptions } from "./types";

export class InMemoryStorage implements StorageProvider {
  private readonly records = new Map<string, PackageRecord>();

  constructor(private readonly options: StorageOptions = {}) {}

  async store(payload: PackageInput): Promise<PackageRecord> {
    const uploadedAt = payload.uploadedAt ?? new Date();
    const expiresAt =
      this.options.ttlMs !== undefined
        ? uploadedAt.getTime() + this.options.ttlMs
        : undefined;

    const record: PackageRecord = {
      ...payload,
      metadata: payload.metadata ?? undefined,
      uploadedAt,
      expiresAt,
    };

    this.records.set(record.id, record);
    return record;
  }

  async get(id: string): Promise<PackageRecord | undefined> {
    const record = this.records.get(id);
    if (!record) return undefined;

    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.records.delete(id);
      return undefined;
    }

    return record;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return (await this.get(id)) !== undefined;
  }

  async list(): Promise<PackageRecord[]> {
    await this.purgeExpired();
    return [...this.records.values()];
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  private async purgeExpired(): Promise<void> {
    const now = Date.now();
    for (const [id, record] of this.records) {
      if (record.expiresAt && record.expiresAt <= now) {
        this.records.delete(id);
      }
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __H5P_SCORM_IN_MEMORY_STORAGE__: InMemoryStorage | undefined; // cspell:disable-line
}

const storageInstance =
  globalThis.__H5P_SCORM_IN_MEMORY_STORAGE__ ??
  (globalThis.__H5P_SCORM_IN_MEMORY_STORAGE__ = new InMemoryStorage());

export const inMemoryStorage = storageInstance;
