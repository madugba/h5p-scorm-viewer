import AdmZip from "adm-zip";
import type { PackageType } from "@/lib/storage";

export interface PackageValidationResult {
  valid: boolean;
  packageType: PackageType | null;
  error?: string;
}

const SCORM_MANIFEST = "imsmanifest.xml";
const H5P_CONFIG = "h5p.json";

export function validatePackageContents(
  buffer: Buffer,
  expectedType: PackageType | "auto"
): PackageValidationResult {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    const filenames = entries.map((e) => e.entryName.toLowerCase());

    const hasScormManifest = filenames.some(
      (f) => f === SCORM_MANIFEST || f.endsWith("/" + SCORM_MANIFEST)
    );
    const hasH5PConfig = filenames.some(
      (f) => f === H5P_CONFIG || f.endsWith("/" + H5P_CONFIG)
    );

    if (expectedType === "scorm") {
      if (!hasScormManifest) {
        return {
          valid: false,
          packageType: null,
          error: "Invalid SCORM package: missing imsmanifest.xml file.",
        };
      }
      return { valid: true, packageType: "scorm" };
    }

    if (expectedType === "h5p") {
      if (!hasH5PConfig) {
        return {
          valid: false,
          packageType: null,
          error: "Invalid H5P package: missing h5p.json file.",
        };
      }
      return { valid: true, packageType: "h5p" };
    }

    if (hasH5PConfig) {
      return { valid: true, packageType: "h5p" };
    }

    if (hasScormManifest) {
      return { valid: true, packageType: "scorm" };
    }

    return {
      valid: false,
      packageType: null,
      error:
        "Invalid package: missing required files. SCORM packages need imsmanifest.xml, H5P packages need h5p.json.",
    };
  } catch (error) {
    return {
      valid: false,
      packageType: null,
      error: `Invalid archive: ${error instanceof Error ? error.message : "unable to read ZIP file"}.`,
    };
  }
}
