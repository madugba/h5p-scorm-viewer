import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { parseH5PArchive } from "@/lib/h5p/parser";

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
  if (!record || record.type !== "h5p") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const parsed = await parseH5PArchive(record.file.buffer);
  const url = new URL(request.url);
  const assetParam = url.searchParams.get("asset");
  const requestedPath = normalizePath(assetParam ?? parsed.metadata.mainFile);

  // Try exact path first, then resolve relative to main file directory
  let assetPath = requestedPath;
  let asset = parsed.assets.get(assetPath);

  if (!asset && assetParam) {
    // Resolve relative path from main file's directory
    const mainDir = getDirectory(parsed.metadata.mainFile);
    const resolvedPath = resolvePath(mainDir, requestedPath);
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
  const contentType =
    CONTENT_TYPE_MAP[extension] ?? "application/octet-stream";

  const body = asset as BufferSource;

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self'"
    }
  });
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
  if (relative.startsWith("/")) {
    return relative.slice(1);
  }

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

