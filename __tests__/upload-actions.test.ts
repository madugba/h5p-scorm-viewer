import { describe, expect, it, beforeEach, vi } from "vitest";
import { File } from "node:buffer";
import { uploadPackageAction } from "../app/upload/actions";
import { initialUploadState } from "../app/upload/state";
import { inMemoryStorage } from "../lib/storage/in-memory-storage";

vi.mock("nanoid", () => ({
  nanoid: () => "pkg1234567"
}));

describe("uploadPackageAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns error when no file is provided", async () => {
    const formData = new FormData();
    formData.set("redirect", "false");
    const state = await uploadPackageAction(initialUploadState, formData);
    expect(state).toEqual({
      status: "error",
      message: "Upload a .h5p or .zip package."
    });
  });

  it("returns error when package type selection is invalid", async () => {
    const file = new File([Buffer.from("data")], "lesson.h5p", {
      type: "application/zip"
    });
    const formData = new FormData();
    formData.set("package", file as unknown as Blob, file.name);
    formData.set("packageType", "invalid");

    const state = await uploadPackageAction(initialUploadState, formData);

    expect(state).toEqual({
      status: "error",
      message: "Invalid package type selection."
    });
  });

  it("stores file and returns success state", async () => {
    const file = new File([Buffer.from("data")], "lesson.h5p", {
      type: "application/zip"
    });
    const formData = new FormData();
    formData.set("package", file as unknown as Blob, file.name);
    formData.set("packageType", "h5p");
    formData.set("redirect", "false");

    const storeSpy = vi
      .spyOn(inMemoryStorage, "store")
      .mockImplementation((record) => ({
        ...record,
        metadata: record.metadata ?? undefined,
        uploadedAt: new Date(),
        expiresAt: undefined
      }));

    const state = await uploadPackageAction(initialUploadState, formData);

    expect(storeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pkg1234567",
        type: "h5p",
        file: expect.objectContaining({
          filename: "lesson.h5p"
        })
      })
    );

    expect(state).toEqual({
      status: "success",
      packageId: "pkg1234567",
      packageType: "h5p"
    });
  });

  it("infers package type from extension when none provided", async () => {
    const file = new File([Buffer.from("zip")], "course.zip", {
      type: "application/zip"
    });
    const formData = new FormData();
    formData.set("package", file as unknown as Blob, file.name);
    formData.set("redirect", "false");

    vi.spyOn(inMemoryStorage, "store").mockImplementation((record) => ({
      ...record,
      metadata: record.metadata ?? undefined,
      uploadedAt: new Date(),
      expiresAt: undefined
    }));

    const state = await uploadPackageAction(initialUploadState, formData);
    expect(state).toEqual({
      status: "success",
      packageId: "pkg1234567",
      packageType: "scorm"
    });
  });
});

