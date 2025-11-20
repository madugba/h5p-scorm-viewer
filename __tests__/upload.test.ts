import { describe, expect, it } from "vitest";
import { inferPackageType } from "../lib/upload/infer-package-type";

describe("upload helpers", () => {
  it("honors explicit package type selection", () => {
    expect(inferPackageType("lesson.zip", "h5p")).toBe("h5p");
    expect(inferPackageType("lesson.h5p", "scorm")).toBe("scorm");
  });

  it("infers type from extension", () => {
    expect(inferPackageType("lesson.h5p", null)).toBe("h5p");
    expect(inferPackageType("course.zip", null)).toBe("scorm");
  });

  it("returns null when unsupported", () => {
    expect(inferPackageType("script.exe", null)).toBeNull();
  });
});

