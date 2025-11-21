import type { StorageProvider } from "./types";
import { InMemoryStorage } from "./in-memory-storage";
import { R2Storage } from "./r2-storage";

export type {
  PackageType,
  StoredFile,
  PackageRecord,
  StorageOptions,
  PackageInput,
  StorageProvider,
} from "./types";

function createStorage(): StorageProvider {
  if (process.env["R2_ACCESS_KEY_ID"] && process.env["R2_SECRET_ACCESS_KEY"]) {
    return new R2Storage();
  }
  return new InMemoryStorage();
}

declare global {
  // eslint-disable-next-line no-var
  var __H5P_SCORM_STORAGE__: StorageProvider | undefined; // cspell:disable-line
}

export const storage: StorageProvider =
  globalThis.__H5P_SCORM_STORAGE__ ??
  (globalThis.__H5P_SCORM_STORAGE__ = createStorage());
