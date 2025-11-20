import { XMLParser } from "fast-xml-parser";
import { tmpdir } from "os";
import { extractZip } from "../security/zip-extractor";

export type ScormVersion = "1.2" | "2004" | "unknown";

export interface ParsedSCORM {
  version: ScormVersion;
  launchFile: string;
  title: string;
  organization?: string | undefined;
  assets: Map<string, Buffer>;
}

const XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true
};

const TEMP_DIR = tmpdir();

export async function parseScormArchive(buffer: Buffer): Promise<ParsedSCORM> {
  const entries = await extractZip(buffer, TEMP_DIR);
  const assets = new Map<string, Buffer>();

  let manifest: Manifest | null = null;

  for (const entry of entries) {
    const normalizedPath = normalizePath(entry.path);
    assets.set(normalizedPath, entry.content);

    if (normalizedPath.toLowerCase() === "imsmanifest.xml") {
      manifest = parseManifest(entry.content.toString());
    }
  }

  if (!manifest) {
    throw new Error("SCORM package missing imsmanifest.xml");
  }

  const { launchFile, title, organization } = extractLaunchData(manifest);

  return {
    version: detectVersion(manifest),
    launchFile,
    title,
    organization,
    assets
  };
}

type Manifest = {
  manifest?: {
    metadata?: {
      schema?: string;
      schemaversion?: string;
    };
    organizations?: {
      default?: string;
      organization?: Organization | Organization[];
    };
    resources?: {
      resource?: Resource | Resource[];
    };
  };
};

type Organization = {
  identifier?: string;
  title?: string;
  item?: Item | Item[];
};

type Item = {
  identifier?: string;
  identifierref?: string;
  title?: string;
  item?: Item | Item[];
};

type Resource = {
  identifier?: string;
  href?: string;
  scormType?: string;
};

function parseManifest(xml: string): Manifest {
  const parser = new XMLParser(XML_OPTIONS);
  return parser.parse(xml) as Manifest;
}

function extractLaunchData(manifest: Manifest): {
  launchFile: string;
  title: string;
  organization?: string | undefined;
} {
  const root = manifest.manifest;
  if (!root) {
    throw new Error("Invalid SCORM manifest");
  }

  const organizations = root.organizations;
  const resources = toArray(root.resources?.resource);
  const defaultOrgId = organizations?.default;
  const organizationList = toArray(organizations?.organization);
  const activeOrg =
    organizationList?.find((org) => org.identifier === defaultOrgId) ??
    organizationList?.[0];

  const firstItem = findFirstItem(activeOrg?.item);
  if (!firstItem?.identifierref) {
    throw new Error("Manifest missing launch item");
  }

  const resource = resources.find(
    (res) => res.identifier === firstItem.identifierref
  );

  if (!resource?.href) {
    throw new Error("Manifest resource missing href");
  }

  return {
    launchFile: resource.href,
    title: firstItem.title ?? activeOrg?.title ?? "SCORM Package",
    organization: activeOrg?.title
  };
}

function detectVersion(manifest: Manifest): ScormVersion {
  const schemaValue = manifest.manifest?.metadata?.schema;
  const versionValue = manifest.manifest?.metadata?.schemaversion;
  const schema =
    typeof schemaValue === "string" ? schemaValue.toLowerCase() : "";
  const version =
    typeof versionValue === "string" ? versionValue.toLowerCase() : "";
  if (schema.includes("scorm 2004") || version.startsWith("2004")) {
    return "2004";
  }
  if (schema.includes("adl scorm") || version.includes("1.2")) {
    return "1.2";
  }
  return "unknown";
}

function findFirstItem(item: Item | Item[] | undefined): Item | undefined {
  if (!item) return undefined;
  if (Array.isArray(item)) {
    return findFirstItem(item[0]);
  }
  if (item.item) {
    return findFirstItem(item.item);
  }
  return item;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

