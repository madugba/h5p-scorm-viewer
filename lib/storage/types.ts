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

export interface PackageInput extends Omit<PackageRecord, "uploadedAt" | "expiresAt"> {
  uploadedAt?: Date;
}

export interface StorageProvider {
  store(payload: PackageInput): Promise<PackageRecord>;
  get(id: string): Promise<PackageRecord | undefined>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  list(): Promise<PackageRecord[]>;
  clear(): Promise<void>;
}
