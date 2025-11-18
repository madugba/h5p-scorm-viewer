import { describe, expect, it } from "vitest";
import {
  validateFile,
  getDefaultValidationConfig,
  getH5PValidationConfig,
  getSCORMValidationConfig
} from "../lib/security/file-validator";
import { ValidationError } from "../lib/security/errors";

describe("file-validator", () => {
  const createFileInput = (overrides: Partial<{
    size: number;
    name: string;
    type: string | undefined;
  }> = {}) => ({
    size: 1024,
    name: "test.h5p",
    type: "application/zip",
    ...overrides
  });

  describe("validateFile", () => {
    it("accepts valid H5P file", () => {
      expect(() => {
        validateFile(createFileInput({ name: "lesson.h5p" }));
      }).not.toThrow();
    });

    it("accepts valid SCORM ZIP file", () => {
      expect(() => {
        validateFile(createFileInput({
          name: "course.zip",
          type: "application/zip"
        }));
      }).not.toThrow();
    });

    it("rejects oversized file", () => {
      const config = getDefaultValidationConfig();
      const oversizedFile = createFileInput({
        size: config.maxSizeBytes + 1
      });

      expect(() => {
        validateFile(oversizedFile);
      }).toThrow(ValidationError);

      try {
        validateFile(oversizedFile);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.code).toBe("SIZE_EXCEEDED");
        }
      }
    });

    it("rejects invalid extension", () => {
      expect(() => {
        validateFile(createFileInput({ name: "malicious.exe" }));
      }).toThrow(ValidationError);

      try {
        validateFile(createFileInput({ name: "malicious.exe" }));
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.code).toBe("INVALID_EXTENSION");
        }
      }
    });

    it("rejects invalid MIME type", () => {
      expect(() => {
        validateFile(createFileInput({
          name: "test.h5p",
          type: "application/x-executable"
        }));
      }).toThrow(ValidationError);

      try {
        validateFile(createFileInput({
          name: "test.h5p",
          type: "application/x-executable"
        }));
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.code).toBe("INVALID_MIME");
        }
      }
    });

    it("accepts file without MIME type", () => {
      expect(() => {
        validateFile(createFileInput({ type: undefined }));
      }).not.toThrow();
    });

    it("rejects missing file", () => {
      expect(() => {
        validateFile({ size: undefined as unknown as number, name: "test.h5p" });
      }).toThrow(ValidationError);

      try {
        validateFile({ size: undefined as unknown as number, name: "test.h5p" });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.code).toBe("MISSING_FILE");
        }
      }
    });

    it("uses custom config when provided", () => {
      const customConfig = {
        maxSizeBytes: 512,
        allowedExtensions: [".custom"],
        allowedMimeTypes: ["application/custom"]
      };

      expect(() => {
        validateFile(
          createFileInput({
            size: 256,
            name: "test.custom",
            type: "application/custom"
          }),
          customConfig
        );
      }).not.toThrow();
    });
  });

  describe("config helpers", () => {
    it("returns default config with correct structure", () => {
      const config = getDefaultValidationConfig();
      expect(config.maxSizeBytes).toBeGreaterThan(0);
      expect(config.allowedMimeTypes.length).toBeGreaterThan(0);
      expect(config.allowedExtensions.length).toBeGreaterThan(0);
    });

    it("returns H5P-specific config", () => {
      const config = getH5PValidationConfig();
      expect(config.allowedExtensions).toContain(".h5p");
      expect(config.allowedExtensions).not.toContain(".zip");
    });

    it("returns SCORM-specific config", () => {
      const config = getSCORMValidationConfig();
      expect(config.allowedExtensions).toContain(".zip");
      expect(config.allowedExtensions).not.toContain(".h5p");
    });
  });
});


