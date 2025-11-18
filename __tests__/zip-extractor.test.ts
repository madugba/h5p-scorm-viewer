import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import AdmZip from "adm-zip";
import { extractZip } from "../lib/security/zip-extractor";
import { ZipExtractionError } from "../lib/security/errors";

function createTestZip(files: Array<{ path: string; content: string }>): Buffer {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addFile(file.path, Buffer.from(file.content));
  }
  return zip.toBuffer();
}

describe("zip-extractor", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "zip-extract-test-"));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("extracts valid ZIP successfully", async () => {
    const zipBuffer = createTestZip([
      { path: "file1.txt", content: "content1" },
      { path: "subdir/file2.txt", content: "content2" }
    ]);

    const extracted = await extractZip(zipBuffer, tempDir);

    expect(extracted).toHaveLength(2);
    expect(extracted[0]?.path).toBe("file1.txt");
    expect(extracted[0]?.content.toString()).toBe("content1");
    expect(extracted[1]?.path).toBe("subdir/file2.txt");
    expect(extracted[1]?.content.toString()).toBe("content2");
  });

  it("rejects zip-slip attack via ../ paths", async () => {
    const zip = new AdmZip();
    zip.addFile("../../../etc/passwd", Buffer.from("malicious"));

    await expect(extractZip(zip.toBuffer(), tempDir)).rejects.toThrow(
      ZipExtractionError
    );

    try {
      await extractZip(zip.toBuffer(), tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ZipExtractionError);
      if (error instanceof ZipExtractionError) {
        expect(error.code).toBe("ZIP_SLIP_DETECTED");
      }
    }
  });

  it("rejects zip-slip attack via absolute paths", async () => {
    const zip = new AdmZip();
    zip.addFile("/etc/passwd", Buffer.from("malicious"));

    await expect(extractZip(zip.toBuffer(), tempDir)).rejects.toThrow(
      ZipExtractionError
    );

    try {
      await extractZip(zip.toBuffer(), tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ZipExtractionError);
      if (error instanceof ZipExtractionError) {
        expect(error.code).toBe("ZIP_SLIP_DETECTED");
      }
    }
  });

  it("rejects zip-slip attack via encoded paths", async () => {
    const zip = new AdmZip();
    zip.addFile("..\\..\\..\\windows\\system32\\config", Buffer.from("malicious"));

    await expect(extractZip(zip.toBuffer(), tempDir)).rejects.toThrow(
      ZipExtractionError
    );
  });

  it("handles empty ZIP", async () => {
    const zipBuffer = createTestZip([]);
    const extracted = await extractZip(zipBuffer, tempDir);
    expect(extracted).toHaveLength(0);
  });

  it("skips directory entries", async () => {
    const zip = new AdmZip();
    zip.addFile("file.txt", Buffer.from("content"));
    zip.addFile("subdir/", Buffer.alloc(0));

    const extracted = await extractZip(zip.toBuffer(), tempDir);
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.path).toBe("file.txt");
  });

  it("rejects ZIP with too many entries", async () => {
    const files = Array.from({ length: 10001 }, (_, i) => ({
      path: `file${i}.txt`,
      content: "content"
    }));
    const zipBuffer = createTestZip(files);

    await expect(extractZip(zipBuffer, tempDir)).rejects.toThrow(
      ZipExtractionError
    );

    try {
      await extractZip(zipBuffer, tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ZipExtractionError);
      if (error instanceof ZipExtractionError) {
        expect(error.code).toBe("TOO_MANY_ENTRIES");
      }
    }
  });

  it("rejects ZIP exceeding total size limit", async () => {
    const largeContent = Buffer.alloc(60 * 1024 * 1024, "x");
    const zip = new AdmZip();
    for (let i = 0; i < 10; i++) {
      zip.addFile(`large${i}.txt`, largeContent);
    }
    const zipBuffer = zip.toBuffer();

    await expect(
      extractZip(zipBuffer, tempDir, { maxTotalSize: 500 * 1024 * 1024 })
    ).rejects.toThrow(ZipExtractionError);

    try {
      await extractZip(zipBuffer, tempDir, { maxTotalSize: 500 * 1024 * 1024 });
    } catch (error) {
      expect(error).toBeInstanceOf(ZipExtractionError);
      if (error instanceof ZipExtractionError) {
        expect(error.code).toBe("SIZE_EXCEEDED");
      }
    }
  });

  it("handles invalid ZIP buffer", async () => {
    const invalidBuffer = Buffer.from("not a zip file");

    await expect(extractZip(invalidBuffer, tempDir)).rejects.toThrow(
      ZipExtractionError
    );

    try {
      await extractZip(invalidBuffer, tempDir);
    } catch (error) {
      expect(error).toBeInstanceOf(ZipExtractionError);
      if (error instanceof ZipExtractionError) {
        expect(error.code).toBe("INVALID_ZIP");
      }
    }
  });

  it("respects custom maxEntries option", async () => {
    const files = Array.from({ length: 100 }, (_, i) => ({
      path: `file${i}.txt`,
      content: "content"
    }));
    const zipBuffer = createTestZip(files);

    const extracted = await extractZip(zipBuffer, tempDir, {
      maxEntries: 200
    });
    expect(extracted).toHaveLength(100);
  });

  it("normalizes Windows-style paths", async () => {
    const zip = new AdmZip();
    zip.addFile("folder\\file.txt", Buffer.from("content"));

    const extracted = await extractZip(zip.toBuffer(), tempDir);
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.path).toBe("folder/file.txt");
  });
});

