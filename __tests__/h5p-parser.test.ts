import { describe, expect, it } from "vitest";
import AdmZip from "adm-zip";
import { parseH5PArchive } from "../lib/h5p/parser";

const createH5PBuffer = ({
  title = "Sample H5P",
  includeContentJson = true
} = {}) => {
  const zip = new AdmZip();
  zip.addFile(
    "h5p.json",
    Buffer.from(
      JSON.stringify({
        title,
        mainLibrary: "H5P.InteractiveVideo"
      }),
      "utf-8"
    )
  );

  if (includeContentJson) {
    zip.addFile(
      "content/content.json",
      Buffer.from(JSON.stringify({ title: `${title} Content` }), "utf-8")
    );
  }

  zip.addFile("content/index.html", Buffer.from("<html></html>", "utf-8"));
  zip.addFile("scripts/app.js", Buffer.from("console.log('h5p');", "utf-8"));
  return zip.toBuffer();
};

describe("parseH5PArchive", () => {
  it("extracts metadata and assets", () => {
    const buffer = createH5PBuffer();
    const parsed = parseH5PArchive(buffer);

    expect(parsed.metadata.title).toBe("Sample H5P Content");
    expect(parsed.metadata.mainFile).toBe("content/index.html");
    expect(parsed.assets.has("content/index.html")).toBe(true);
    expect(parsed.assets.has("scripts/app.js")).toBe(true);
  });

  it("falls back to h5p.json title when content metadata missing", () => {
    const buffer = createH5PBuffer({ includeContentJson: false });
    const parsed = parseH5PArchive(buffer);

    expect(parsed.metadata.title).toBe("Sample H5P");
  });
});

