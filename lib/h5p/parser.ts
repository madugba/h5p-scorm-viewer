import { tmpdir } from "os";
import { extractZip } from "../security/zip-extractor";

export interface H5PMetadata {
  title: string;
  mainLibrary?: string | undefined;
  mainFile: string;
  language?: string | undefined;
}

export interface ParsedH5P {
  metadata: H5PMetadata;
  assets: Map<string, Buffer>;
}

const DEFAULT_MAIN_FILES = [
  "content/index.html",
  "content/content.html",
  "content/content.json",
  "h5p.json"
];

const TEMP_DIR = tmpdir();

export async function parseH5PArchive(buffer: Buffer): Promise<ParsedH5P> {
  const entries = await extractZip(buffer, TEMP_DIR);
  const assets = new Map<string, Buffer>();

  let h5pConfig: Record<string, unknown> | undefined;
  let contentConfig: Record<string, unknown> | undefined;

  for (const entry of entries) {
    const normalizedPath = normalizePath(entry.path);
    assets.set(normalizedPath, entry.content);

    if (normalizedPath === "h5p.json") {
      h5pConfig = safeJsonParse(entry.content.toString("utf-8"));
    }
    if (normalizedPath === "content/content.json") {
      contentConfig = safeJsonParse(entry.content.toString("utf-8"));
    }
  }

  const title =
    typeof contentConfig?.["title"] === "string"
      ? contentConfig["title"] as string
      : typeof h5pConfig?.["title"] === "string"
        ? (h5pConfig["title"] as string)
        : "H5P Package";

  const mainFile = resolveMainFile(assets);

  return {
    metadata: {
      title,
      mainLibrary:
        typeof h5pConfig?.["mainLibrary"] === "string"
          ? (h5pConfig["mainLibrary"] as string)
          : undefined,
      mainFile,
      language:
        typeof h5pConfig?.["language"] === "string"
          ? (h5pConfig["language"] as string)
          : undefined
    },
    assets
  };
}

function resolveMainFile(assets: Map<string, Buffer>): string {
  for (const candidate of DEFAULT_MAIN_FILES) {
    if (assets.has(candidate)) {
      return candidate;
    }
  }
  const firstEntry = assets.keys().next();
  return firstEntry.value ?? "content/index.html";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function safeJsonParse(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed;
  } catch {
    return undefined;
  }
}

