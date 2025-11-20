import type { PackageType } from "../storage/in-memory-storage";

const EXTENSION_TO_TYPE: Record<string, PackageType> = {
  ".h5p": "h5p",
  ".zip": "scorm"
};

export function inferPackageType(
  filename: string,
  override: string | null
): PackageType | null {
  if (override === "h5p" || override === "scorm") {
    return override;
  }
  const extension = getFileExtension(filename);
  return EXTENSION_TO_TYPE[extension] ?? null;
}

function getFileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

