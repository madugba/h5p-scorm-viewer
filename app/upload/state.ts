import type { PackageType } from "@/lib/storage/in-memory-storage";

export type UploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; packageId: string; packageType: PackageType };

export const initialUploadState: UploadState = { status: "idle" };

