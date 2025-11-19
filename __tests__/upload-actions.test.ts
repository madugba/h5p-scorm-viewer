import { describe, expect, it, beforeEach, vi } from "vitest";
import { File } from "node:buffer";
import {
  uploadPackageAction,
  initialUploadState
} from "../app/upload/actions";
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
    const state = await uploadPackageAction(initialUploadState, formData);
    expect(state).toEqual({
      status: "error",
      message: "Upload a .h5p or .zip package."
    });
  });

  it("stores file and returns success state", async () => {
    const file = new File([Buffer.from("data")], "lesson.h5p", {
      type: "application/zip"
    });
    const formData = new FormData();
    formData.set("package", file);
    formData.set("packageType", "h5p");

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
    formData.set("package", file);

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

