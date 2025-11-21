import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { parseScormArchive } from "@/lib/scorm/parser";
import { buildScormApiScript } from "@/lib/scorm/api-shim";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf"
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const record = await storage.get(id);
  if (!record || record.type !== "scorm") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  let parsed;
  try {
    parsed = await parseScormArchive(record.file.buffer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Unable to parse this SCORM package. Confirm the archive contains a valid imsmanifest.xml file and try again.",
        details: (error as Error).message ?? "Unknown parsing error."
      },
      { status: 422 }
    );
  }
  const url = new URL(request.url);
  const assetParam = url.searchParams.get("asset");
  const requestedPath = normalizePath(assetParam ?? parsed.launchFile);

  // Try exact path first, then resolve relative to launch file directory
  let assetPath = requestedPath;
  let asset = parsed.assets.get(assetPath);

  if (!asset && assetParam) {
    // Resolve relative path from launch file's directory
    const launchDir = getDirectory(parsed.launchFile);
    const resolvedPath = resolvePath(launchDir, requestedPath);
    asset = parsed.assets.get(resolvedPath);
    if (asset) {
      assetPath = resolvedPath;
    }
  }

  if (!asset) {
    return NextResponse.json(
      { error: `Asset "${assetPath}" not found` },
      { status: 404 }
    );
  }

  const extension = getExtension(assetPath);
  let body: Buffer | string = asset;

  if (extension === ".html" || extension === ".htm") {
    const html = asset.toString("utf-8");
    body = injectShim(html, buildScormApiScript(record.id));
  }

  const contentType =
    CONTENT_TYPE_MAP[extension] ?? "application/octet-stream";

  const responseBody =
    typeof body === "string" ? body : (body as BufferSource as BodyInit);

  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'"
    }
  });
}

function injectShim(html: string, script: string): string {
  const shimTag = `<script>${script}</script>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${shimTag}</head>`);
  }
  return `${shimTag}${html}`;
}

function getExtension(path: string): string {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\//, "");
}

function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash > 0 ? path.slice(0, lastSlash + 1) : "";
}

function resolvePath(base: string, relative: string): string {
  // Handle absolute paths
  if (relative.startsWith("/")) {
    return relative.slice(1);
  }

  // Handle ../ and ./ references
  const parts = (base + relative).split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }

  return resolved.join("/");
}

