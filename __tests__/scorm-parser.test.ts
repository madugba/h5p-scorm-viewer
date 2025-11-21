import { describe, expect, it } from "vitest";
import AdmZip from "adm-zip";
import { parseScormArchive } from "../lib/scorm/parser";

const createManifest = ({
  version = "1.2",
  launch = "index.html",
  title = "Sample Course"
}: {
  version?: string;
  launch?: string;
  title?: string;
}) => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="Example" version="1.0">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${version}</schemaversion>
  </metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>${title}</title>
      <item identifier="ITEM1" identifierref="RES1">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" href="${launch}" scormType="sco" />
  </resources>
</manifest>`;

const createScormBuffer = (manifest: string, basePath = "") => {
  const zip = new AdmZip();
  const manifestPath = basePath ? `${basePath}/imsmanifest.xml` : "imsmanifest.xml";
  const htmlPath = basePath ? `${basePath}/index.html` : "index.html";
  zip.addFile(manifestPath, Buffer.from(manifest, "utf-8"));
  zip.addFile(htmlPath, Buffer.from("<html></html>", "utf-8"));
  return zip.toBuffer();
};

describe("parseScormArchive", () => {
  it("detects SCORM 1.2 manifest", async () => {
    const buffer = createScormBuffer(createManifest({ version: "1.2" }));
    const parsed = await parseScormArchive(buffer);
    expect(parsed.version).toBe("1.2");
    expect(parsed.launchFile).toBe("index.html");
    expect(parsed.assets.has("imsmanifest.xml")).toBe(true);
  });

  it("detects SCORM 2004 manifest", async () => {
    const buffer = createScormBuffer(createManifest({ version: "2004 4th Edition" }));
    const parsed = await parseScormArchive(buffer);
    expect(parsed.version).toBe("2004");
  });

  it("throws when manifest missing", async () => {
    const zip = new AdmZip();
    const buffer = zip.toBuffer();
    await expect(parseScormArchive(buffer)).rejects.toThrow();
  });

  it("handles manifest in subdirectory", async () => {
    const buffer = createScormBuffer(createManifest({ version: "1.2" }), "content");
    const parsed = await parseScormArchive(buffer);
    expect(parsed.version).toBe("1.2");
    expect(parsed.launchFile).toBe("content/index.html");
    expect(parsed.assets.has("content/imsmanifest.xml")).toBe(true);
    expect(parsed.assets.has("content/index.html")).toBe(true);
  });

  it("handles deeply nested manifest", async () => {
    const buffer = createScormBuffer(createManifest({ version: "2004 4th Edition" }), "scorm/package");
    const parsed = await parseScormArchive(buffer);
    expect(parsed.version).toBe("2004");
    expect(parsed.launchFile).toBe("scorm/package/index.html");
  });
});

